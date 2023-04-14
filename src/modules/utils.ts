import { Messager } from "./views";

export async function trans2Items(data: string, libraryID: number) {
    var translate = new Zotero.Translate.Import();
    translate.setTranslator("1a3506da-a303-4b0a-a1cd-f216e6138d86");
    translate.setString(data);
    Zotero.debug("** Jasminum translate begin ...");
    let newItems = await translate.translate({
        libraryID: libraryID,
        saveAttachments: false,
    });
    if (newItems.length) {
        Zotero.debug(
            `** Jasminum translate end. ${newItems.lengt} translated.`
        );
        return newItems;
    } else {
        Messager.showPopup("No results found!", "warn", 1);
        throw Error("No item found from refworks text");
    }
}

export async function fixItem(newItems: Zotero.Item[], targetData: any) {
    let creators: MyCreator[];
    // 学位论文Thesis，导师 -> contributor
    for (let idx = 0; idx < newItems.length; idx++) {
        var newItem = newItems[idx];
        if (newItem.getNotes()) {
            if (Zotero.ItemTypes.getName(newItem.itemTypeID) == "thesis") {
                creators = newItem.getCreators() as MyCreator[];
                var note = Zotero.Items.get(newItem.getNotes()[0])
                    .getNote()
                    .split(/<br\s?\/>/);
                // Zotero.debug(note);
                for (let line of note) {
                    if (line.startsWith("A3")) {
                        let creator: MyCreator = {
                            firstName: "",
                            lastName: line.replace("A3 ", ""),
                            creatorType: "contributor",
                            fieldMode: 1,
                        };
                        creators.push(creator);
                    }
                }
                newItem.setCreators(creators);
            }
            Zotero.Items.erase(newItem.getNotes());
        }
        // 是否处理中文姓名. For Chinese name
        if (Zotero.Prefs.get("jasminum.zhnamesplit")) {
            creators = newItem.getCreators() as MyCreator[];
            for (var i = 0; i < creators.length; i++) {
                var creator = creators[i];
                creator.fieldMode = 0;
                if (creator.firstName) continue;

                var lastSpace = creator.lastName.lastIndexOf(" ");
                if (
                    creator.lastName.search(/[A-Za-z]/) !== -1 &&
                    lastSpace !== -1
                ) {
                    // western name. split on last space
                    creator.firstName = creator.lastName.substr(
                        0,
                        lastSpace
                    );
                    creator.lastName = creator.lastName.substr(
                        lastSpace + 1
                    );
                } else {
                    // Chinese name. first character is last name, the rest are first name
                    creator.firstName = creator.lastName.substr(1);
                    creator.lastName = creator.lastName.charAt(0);
                }
                creators[i] = creator;
            }
            newItem.setCreators(creators);
        }
        // Clean up abstract
        if (newItem.getField("abstractNote")) {
            newItem.setField(
                "abstractNote",
                (newItem.getField("abstractNote") as string)
                    .replace(/\s*[\r\n]\s*/g, "\n")
                    .replace(/&lt;.*?&gt;/g, "")
            );
        }
        // Parse page content.
        var extraString = "";
        Zotero.debug("** Jasminum get article page.");
        let html = await getHTMLDoc(targetData["targetUrls"][idx]);
        // Full abstract note.
        if ((newItem.getField("abstractNote") as string).endsWith("...")) {
            let abs = html.querySelector("#ChDivSummary") as HTMLElement;
            Zotero.debug("** Jasminum abs " + abs!.innerText);
            if (abs.innerText) {
                newItem.setField("abstractNote", abs.innerText.trim());
            }
        }
        // Add DOI
        let doi = Zotero.Utilities.xpath(
            html,
            "//*[contains(text(), 'DOI')]/following-sibling::p"
        );
        if ("DOI" in newItem && doi != null) {
            // Some items lack DOI field
            newItem.setField("DOI", doi![0].getAttribute("innerText")!);
        }

        // Remove wront CN field.
        newItem.setField("callNumber", "");
        if (Zotero.ItemTypes.getName(newItem.itemTypeID) != "patent") {
            newItem.setField("libraryCatalog", "CNKI");
        }
        newItem.setField("url", targetData["targetUrls"][idx]);
        if (targetData.citations[idx]) {
            // Add citation
            var dateString = new Date()
                .toLocaleDateString()
                .replace(/\//g, "-");
            var citationString = `${targetData.citations[idx]} citations(CNKI)[${dateString}]`;
            extraString = citationString;
        }

        // Add Article publisher type, surrounded by <>. 核心期刊
        var publisherType = Zotero.Utilities.xpath(
            html,
            "//div[@class='top-tip']//a[@class='type']"
        );
        if (publisherType != null) {
            extraString =
                extraString +
                "<" +
                Array.from(publisherType)
                    .map((ele) => ele.getAttribute("innerText"))
                    .join(", ") +
                ">";
        }

        newItem.setField("extra", extraString);

        // Keep tags according global config.
        if (Zotero.Prefs.get("automaticTags") === false) {
            newItem.setTags([]);
        }
        // Change tag type
        var tags = newItem.getTags();
        // Zotero.debug('** Jasminum tags length: ' + tags.length);
        if (tags.length > 0) {
            var newTags = [];
            for (let tag of tags) {
                tag.type = 1;
                newTags.push(tag);
            }
            newItem.setTags(newTags);
        }
        newItems[idx] = newItem;
    }
    return newItems;
}

export function string2HTML(text: string) {
    // Use DOMParser to parse text to HTML.
    // This DOMParser is from XPCOM.
    /*         var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
                .createInstance(Components.interfaces.nsIDOMParser); */
    var parser = new DOMParser(); // Use HTML DOMParser #158
    return parser.parseFromString(text, "text/html");
}

/**
 * Get CNKI URL from CNKI article id
 * @param {Object} CNKI ID article id
 * @param {Boolean} true for oversea url
 * @return {String} CNKI URL
 */
export function getURLFromID(id: CNKIID, en: boolean = false) {
    if (en) {
        return `https://oversea.cnki.net/KCMS/detail/detail.aspx?dbcode=${id.dbcode}&dbname=${id.dbname}&filename=${id.filename}&uniplatform=OVERSEAS_EN&v=uJhTu8ARyQjLVTb37OvEMX33PdTT8h_zaEK0x_NWeHUCzOM1XyJXSzWJWLAp2Wty`;
    } else {
        return `https://kns.cnki.net/KCMS/detail/detail.aspx?dbcode=${id.dbcode}&dbname=${id.dbname}&filename=${id.filename}&v=`;
    }
}

export function splitFilename(filename: string) {
    // Make query parameters from filename
    const patent = Zotero.Prefs.get("jasminum.namepatent") as string;
    let prefix = filename
        .replace(/\.\w+$/, "") // 删除文件后缀
        .replace(/\.ashx$/g, "") // 删除末尾.ashx字符
        .replace(/^_|_$/g, "") // 删除前后的下划线
        .replace(/[（\(]\d+[）\)]$/, ""); // 删除重复下载时文件名出现的数字编号 (1) （1）
    // 当文件名模板为"{%t}_{%g}"，文件名无下划线_时，将文件名认定为标题
    if (patent === "{%t}_{%g}" && !prefix.includes("_")) {
        return {
            author: "",
            keyword: prefix,
        };
    }
    let patentSepArr: string[] = patent.split(/{%[^}]+}/);
    let patentSepRegArr: string[] = patentSepArr.map((x) =>
        x.replace(/([\[\\\^\$\.\|\?\*\+\(\)])/g, "\\$&")
    );
    let patentMainArr: string[] | null = patent.match(/{%[^}]+}/g);
    //文件名中的作者姓名字段里不能包含下划线，请使用“&,，”等字符分隔多个作者，或仅使用第一个作者名（加不加“等”都行）。
    let patentMainRegArr = patentMainArr!.map((x) =>
        x.replace(
            /.+/,
            /{%y}/.test(x) ? "(\\d+)" : /{%g}/.test(x) ? "([^_]+)" : "(.+)"
        )
    );
    let regStrInterArr = patentSepRegArr.map((_, i) => [
        patentSepRegArr[i],
        patentMainRegArr[i],
    ]);
    let patentReg = new RegExp(
        [].concat.apply([], regStrInterArr as never).filter(Boolean).join(""),
        "g"
    );

    let prefixMainArr = patentReg.exec(prefix);
    // 文件名识别结果为空，跳出警告弹窗
    if (prefixMainArr === null) {
        Messager.showPopup(
            `文件名识别出错，请检查文件名识别模板与实际抓取文件名。文件名: ${filename}，识别模板为: ${patent}`,
            "error"
        );
        return;
    }
    let titleIdx = patentMainArr!.indexOf("{%t}");
    let authorIdx = patentMainArr!.indexOf("{%g}");
    let titleRaw = titleIdx != -1 ? prefixMainArr[titleIdx + 1] : "";
    let authors = authorIdx != -1 ? prefixMainArr[authorIdx + 1] : "";
    let authorArr = authors.split(/[,，&]/);
    let author = authorArr[0];
    if (authorArr.length == 1) {
        //删除名字后可能出现的“等”字，此处未能做到识别该字是否属于作者姓名。
        //这种处理方式的问题：假如作者名最后一个字为“等”，例如：“刘等”，此时会造成误删。
        //于是对字符数进行判断，保证删除“等”后，至少还剩两个字符，尽可能地避免误删。

        author =
            author.endsWith("等") && author.length > 2
                ? author.substr(0, author.length - 1)
                : author;
    }

    //为了避免文件名中的标题字段里存在如下两种情况而导致的搜索失败:
    //原标题过长，文件名出现“_省略_”；
    //原标题有特殊符号（如希腊字母、上下标）导致的标题变动，此时标题也会出现“_”。
    //于是只取用标题中用“_”分割之后的最长的部分作为用于搜索的标题。

    //这种处理方式的问题：假如“最长的部分”中存在知网改写的部分，也可能搜索失败。
    //不过这只是理论上可能存在的情形，目前还未实际遇到。

    let title: string;
    // Zotero.debug(titleRaw);
    // if (/_/.test(titleRaw)) {

    //     //getLongestText函数，用于拿到字符串数组中的最长字符
    //     //摘自https://stackoverflow.com/a/59935726
    //     const getLongestText = (arr) => arr.reduce(
    //         (savedText, text) => (text.length > savedText.length ? text : savedText),
    //         '',
    //     );
    //     title = getLongestText(titleRaw.split(/_/));
    // } else {
    //     title = titleRaw;
    // }

    // 去除_省略_ "...", 多余的 _ 换为空格
    // 标题中含有空格，查询时会启用模糊模式
    title = titleRaw.replace("_省略_", " ").replace("...", " ");
    title = title.replace(/_/g, " ");
    return {
        author: author,
        keyword: title,
    };
}

/**
 * Select the right result row.
 * Use item.title or string as display title, index as key.
 */
export function selectRows(targetRows: ResultRow[]) {
    let rowSelectors = targetRows.reduce((p:any, c, i:number) => {p[i]=c.title; return p;}, {});
    Zotero.debug("**Jasminum select window start");
    var io = { dataIn: rowSelectors, dataOut: null };
    window.openDialog(
        "chrome://zotero/content/ingester/selectitems.xul",
        "_blank",
        "chrome,modal,centerscreen,resizable=yes",
        io
    );
    let resultRows: ResultRow[] = [];
    let targetIndicator = io.dataOut;
    Zotero.debug("**Jasminum select window end");
    // Zotero.debug(targetIndicator);
    // No item selected, return null
    if (!targetIndicator) return resultRows;
    Object.keys(targetIndicator).forEach(function (i) {
        resultRows.push(targetRows[parseInt(i)]);
    });
    return resultRows;
}



export function getIDFromURL(url: string): CNKIID | boolean {
    if (!url) return false;
    // add regex for navi.cnki.net
    var dbname = url.match(/[?&](?:db|table)[nN]ame=([^&#]*)/i);
    var filename = url.match(/[?&]filename=([^&#]*)/i);
    var dbcode = url.match(/[?&]dbcode=([^&#]*)/i);
    if (
        !dbname ||
        !dbname[1] ||
        !filename ||
        !filename[1] ||
        !dbcode ||
        !dbcode[1]
    )
        return false;
    return { dbname: dbname[1], filename: filename[1], dbcode: dbcode[1] };
}

/**
 * Sometimes CNKI URL contains a temporary dbname,
 * you need to find a valid dbname from page.
 * @param {HTMLDocument}
 * @return {Object} {dbname: ..., filename: ..., dbcode: ...}
 */
export function getIDFromPage(page: Document): CNKIID | boolean {
    Zotero.debug(page.title);
    if (page.title == "知网节超时验证") {
        Zotero.debug("** Jasminum 知网节超时验证");
        return false;
    }
    let dbcode = page
        .querySelector("input#paramdbcode")!
        .getAttribute("value") as string;
    let filename = page
        .querySelector("input#paramfilename")!
        .getAttribute("value") as string;
    let dbname = page
        .querySelector("input#paramdbname")!
        .getAttribute("value") as string;
    Zotero.debug(`${dbname}, ${dbcode}, ${filename}`);
    return { dbname: dbname, filename: filename, dbcode: dbcode };
}

/**
 * Get CNKI article id
 * @param {String} url CNKI url string
 * @return {Object} article id
 */
export async function getCNKIID(url: string, fromPage: boolean=false): Promise<CNKIID | boolean> {
    if (!fromPage && getIDFromURL(url)) {
        return getIDFromURL(url);
    } else {
        let htmlString = await getHTMLPage(url);
        let htmlDocument = string2HTML(htmlString);
        return getIDFromPage(htmlDocument);
    }
}

/**
 * Get Html content text from given url
 * @param {String} url
 * @returns {String}
 */
export async function getHTMLPage(url: string) {
    let pageResp = await Zotero.HTTP.request("GET", url);
    return pageResp.responseText;
}

export async function getHTMLDoc(url: string) {
    const responseText = await getHTMLPage(url);
    return string2HTML(responseText);
}


/**
* get items from different type
* @param {string}
* @return {[Zotero.item]}
*/
export function getItems(type: string = "items", regular: boolean = false) {
    let items: Zotero.Item[] = [];
    if (type === "items") {
        items = ZoteroPane.getSelectedItems()
    } else if (type === "collection") {
        let collection = ZoteroPane.getSelectedCollection();
        if (collection) items = collection.getChildItems();
    }
    // 只保留元数据条目
    // 用于解决多选项目时选中附件类条目导致小组件修改错误，使得批量修改中断。
    if (regular) items = items.filter(item => item.isRegularItem());
    return items;
}
