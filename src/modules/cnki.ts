import { createRefPostData, getRefworksText, searchCNKI } from "./scrape";
import { fixItem, getCNKIID, getIDFromURL, getItems, splitFilename, trans2Items } from "./utils";
import { isCNKIPDF, Messager } from "./views";

export async function searchCNKIMetadata(type: string) {
    let items = getItems(type);
    if (items.length == 0) return;
    for (let item of items) {
        const itemCollections = item.getCollections();
        Zotero.debug(itemCollections);
        const libraryID = item.libraryID;
        // Retrive meta data for webpage item OR you can use title to search
        if (Zotero.ItemTypes.getName(item.itemTypeID) === "webpage") {
            Zotero.debug("** Jasminum add webpage.");
            let articleId = await getCNKIID(item.getField("url") as string) as CNKIID;
            Zotero.debug([articleId]);
            let data = await getRefworksText([articleId]);
            // Zotero.debug("** Jasminum webpage data");

            let newItems = await trans2Items(data, libraryID);
            let targetData = {
                targetUrls: [item.getField("url") as string],
                citations: [''],
            };
            newItems = await fixItem(newItems, targetData);
            // Keep the same collection in newItem.
            if (itemCollections.length) {
                for (let collectionID of itemCollections) {
                    for (let i of newItems) {
                        i.addToCollection(collectionID);
                        await i.saveTx();
                    }
                }
            }
            // Move notes and attachments to newItems
            let childIDs = item.getNotes().concat(item.getAttachments());
            if (childIDs.length > 0) {
                for (let childID of childIDs) {
                    var childItem = Zotero.Items.get(childID);
                    childItem.parentID = newItems[0].id;
                    await childItem.saveTx();
                }
            }

            // Move item to Trash
            item.deleted = true;
            await item.saveTx();
        } else {
            var fileData = splitFilename(item.attachmentFilename);
            Zotero.debug(fileData);
            var targetRows = await searchCNKI(fileData);
            // 有查询结果返回
            if (targetRows.length > 0) {
                const ids = targetRows.map(r => r.id);
                const targetData = targetRows.reduce((p:any, c) => {p.targetUrls.push(c.url); p.citation.push(c.citation); return p;}, {targetUrls: [], citations: []});
                let data = await getRefworksText(ids);
                let newItems = await trans2Items(data, libraryID);
                newItems = await fixItem(newItems, targetData);
                Zotero.debug("** Jasminum DB trans ...");
                if (itemCollections.length) {
                    for (let collectionID of itemCollections) {
                        newItems.forEach((i: Zotero.Item) => item.addToCollection(collectionID));
                    }
                }
                // 只有单个返回结果
                if (newItems.length == 1) {
                    var newItem = newItems[0];
                    // Put old item as a child of the new item
                    item.parentID = newItem.id;
                    // Use Zotfile to rename file
                    if (
                        Zotero.Prefs.get("jasminum.rename") &&
                        typeof Zotero.ZotFile != "undefined"
                    ) {
                        Zotero.ZotFile.renameSelectedAttachments();
                    }

                    await item.saveTx();
                    await newItem.saveTx();
                    // Add bookmark after PDF attaching to new item
                    if (
                        Zotero.Prefs.get("jasminum.autobookmark") &&
                        isCNKIPDF(item)
                    ) {
                        // await addBookmarkItem(item);
                    }
                } else {
                    // 有多个返回结果，将文件与新条目关联，用于用户后续手动选择
                    newItems.forEach((i: Zotero.Item) => item.addRelatedItem(newItem));
                    await item.saveTx();
                }

                Zotero.debug("** Jasminum finished.");
            } else {
                // 没有查询结果
                Messager.showPopup(
                    `作者：${fileData!.author},\n   篇名：${fileData!.keyword},\n   未查询到结果`,
                    "warn"
                );
            }
        }
    }
}
