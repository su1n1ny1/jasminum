import { getString } from "./locale";
import { config } from "../../package.json";
import { autoSetLanguage, concatName, dateFormatter, manualSetLanguage, removeComma, splitName, splitSemicolonNames } from "./tools";

// Control submenu display
/**
     * Return true when item is a single CNKI file
     * Filename contains Chinese characters and ends with pdf/caj
     * @param {Zotero.item}
     * @return {bool}
     */
function isCNKIFile(item: Zotero.Item) {
    // Return true, when item is OK for update cnki data.
    if (
        !item.isAttachment() ||
        item.isRegularItem() ||
        !item.isTopLevelItem()
    ) {
        return false;
    }

    var filename = item.attachmentFilename;
    // Find Chinese characters in string
    if (escape(filename).indexOf("%u") < 0) return false;
    // Extension should be CAJ , PDF, kdh, nh
    var ext = filename.match(/\.(\w+)$/)![1];
    if (!['pdf', 'caj', 'kdh', 'nh'].includes(ext)) return;
    return true;
}

/**
 * Return true when item is top level item.
 * @param {Zotero.item}
 * @return {bool}
 */
function isRegularTopItem(item: Zotero.Item) {
    return !item.isAttachment() && item.isRegularItem() && item.isTopLevelItem();
}

/**
 * Return true when item is a CNKI PDF attachment.
 * @param {Zotero.item}
 * @return {bool}
 */
export function isCNKIPDF(item: Zotero.Item): boolean {
    return (
        !item.isTopLevelItem() &&
        item.isAttachment() &&
        item.attachmentContentType &&
        item.attachmentContentType === "application/pdf" &&
        Zotero.ItemTypes.getName(item.parentItem!.itemTypeID) === "thesis"
    ) as boolean;
}

function isCNKIWeb(item: Zotero.Item) {
    return (
        item.isTopLevelItem() &&
        item.isRegularItem() &&
        Zotero.ItemTypes.getName(item.itemTypeID) === "webpage" &&
        (item.getField("title") as string).endsWith("中国知网")
    );
}

function test(): boolean {
    const items = ZoteroPane.getSelectedItems();
    Zotero.debug("******Click test to show menu!");
    return items.some((item) => isCNKIFile(item) || isCNKIWeb(item));
}



export class Views {
    static registerRightClickMenu() {
        const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
        const items = ZoteroPane.getSelectedItems();
        Zotero.debug(`** menu selected item length: ${items.length}`);
        let showSearch = items.some((item) => isCNKIFile(item) || isCNKIWeb(item));
        let showRegularTop = items.some((item) => isRegularTopItem(item));
        // item menuitem with icon
        let showBookmark = false;
        if (items.length == 1) showBookmark = isCNKIPDF(items[0]);
        Zotero.debug(`** showSearch ${showSearch}, showRegularTop ${showRegularTop}, showBookmark ${showBookmark}`);
        ztoolkit.Menu.register("item", {
            tag: "menu",
            id: "jasminum-popup-menu-cnki",
            label: getString("menu.CNKI.label"),
            icon: iconBaseUrl + "cnki.png",
            children: [
                {
                    tag: "menuitem",
                    label: getString("menu.CNKI.update.label"),
                    oncommand: "alert('menu.CNKI.update.label')",
                    icon: iconBaseUrl + 'searchCNKI.png',
                    getVisibility: (elem, en) => test()
                },
                {
                    tag: "menuitem",
                    label: getString("menu.CNKI.updateCiteCSSCI.label"),
                    oncommand: "alert('menu.CNKI.updateCiteCSSCI.label')",
                    icon: iconBaseUrl + 'cssci.png',
                    hidden: !showRegularTop
                },
                {
                    tag: "menuitem",
                    label: getString("menu.CNKI.attachment.label"),
                    oncommand: "alert('menu.CNKI.attachment.label')",
                    icon: iconBaseUrl + 'pdf.png',
                    hidden: !showRegularTop
                },
                {
                    tag: "menuitem",
                    label: getString("menu.CNKI.addBookmark.label"),
                    oncommand: "alert('menu.CNKI.addBookmark.label')",
                    icon: iconBaseUrl + 'bookmark.png',
                    hidden: showBookmark
                }
            ]
        });

        ztoolkit.Menu.register("item", {
            tag: "menu",
            id: "jasminum-popup-menu-tools",
            label: getString("menu.tools.label"),
            icon: iconBaseUrl + "tools.png",
            hidden: !(showSearch || showRegularTop || showBookmark),
            children: [
                {
                    tag: "menuitem",
                    label: getString("menu.tools.namesplit.label"),
                    commandListener: (ev) => splitName("items"),
                    icon: iconBaseUrl + 'name.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.namemerge.label"),
                    commandListener: (ev) => concatName('items'),
                    icon: iconBaseUrl + 'name.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.semicolonNamesSplit.label"),
                    commandListener: (ev) => splitSemicolonNames("items"),
                    icon: iconBaseUrl + 'name.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.removeDot.label"),
                    commandListener: (ev) => removeComma("items"),
                    icon: iconBaseUrl + 'bullet_yellow.png'
                }
                ,
                {
                    tag: "menuitem",
                    label: getString("menu.tools.bacthsetlanguage.label"),
                    commandListener: (ev) => autoSetLanguage("items"),
                    icon: iconBaseUrl + 'language.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.manualsetlanguage.label"),
                    commandListener: (ev) => manualSetLanguage("items"),
                    icon: iconBaseUrl + 'flag-china.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.dateformatter.label"),
                    commandListener: (ev) => dateFormatter("items"),
                    icon: iconBaseUrl + 'date.png'
                }
            ]
        });
    }
}

export class Messager {
    static showPopup(text: string, type: string, timer: number = 1) {
        const popupWin  = new ztoolkit.ProgressWindow(config.addonName, {
            closeOnClick: true,
            closeTime: timer,
          })
            .createLine({
              text: text,
              type: type,
            })
            .show();
        popupWin.startCloseTimer(5000);
    }
}
