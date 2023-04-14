import { Messager, isCNKIPDF } from "./views";
import { fixItem, getCNKIID, getHTMLDoc, getIDFromPage, getIDFromURL, getURLFromID, selectRows, splitFilename, string2HTML, trans2Items } from "./utils";

export class MyCookieSandbox {
    public searchCookieBox: any;
    public attachmentCookieBox: any;
    public refCookieBox: any;
    userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
    baseUrl = "https://cnki.net/";

    constructor() {
        this.searchCookieBox = this.setSearchCookieBox();
        this.attachmentCookieBox = this.setAttachmentCookieBox();
        this.refCookieBox = this.setRefCookieSandbox();
    }

    setSearchCookieBox() {
        const cookieData =
            "Ecp_ClientId=1200104193103044969; RsPerPage=20; " +
            "cnkiUserKey=60c42f4d-35a2-6d3f-6efc-ad01eaffd4c3; " +
            "_pk_ref=%5B%22%22%2C%22%22%2C1604497317%2C%22https%3A%2F%2Fcnki.net%2F%22%5D; " +
            "ASP.NET_SessionId=zcw1abnl5vitqcliiq5almmj; " +
            "SID_kns8=123121; " +
            "Ecp_IpLoginFail=20110839.182.10.65";
        return new Zotero.CookieSandbox(null, this.baseUrl, cookieData, this.userAgent);
    }

    setAttachmentCookieBox() {
        const cookieData = Zotero.Prefs.get("jasminum.cnki.attachment.cookie") as string;
        return new Zotero.CookieSandbox(null, this.baseUrl, cookieData, this.userAgent);
    }

    setRefCookieSandbox() {
        const cookieData =
            "Ecp_ClientId=1200104193103044969; RsPerPage=20; " +
            "cnkiUserKey=60c42f4d-35a2-6d3f-6efc-ad01eaffd4c3; " +
            "ASP.NET_SessionId=zcw1abnl5vitqcliiq5almmj; " +
            "SID_kns8=123121; Ecp_IpLoginFail=20110839.182.10.65; " +
            "SID_recommendapi=125144; CurrSortFieldType=desc; " +
            "SID_kns=025123117; " +
            "CurrSortField=%e5%8f%91%e8%a1%a8%e6%97%b6%e9%97%b4%2f(%e5%8f%91%e8%a1%a8%e6%97%b6%e9%97%b4%2c%27TIME%27); " +
            "SID_kcms=124117; " +
            "_pk_ref=%5B%22%22%2C%22%22%2C1604847086%2C%22https%3A%2F%2Fcnki.net%2F%22%5D; " +
            "_pk_ses=*";
        return new Zotero.CookieSandbox(null, this.baseUrl, cookieData, this.userAgent);
    };

    // Update cookiebox when attachment cookie is updated.
    updateAttachmentCookieBox() {
        this.attachmentCookieBox = this.setAttachmentCookieBox();
    }
}

export function createRefPostData(ids: CNKIID[]) {
    // filename=CPFDLAST2020!ZGXD202011001016!1!14%2CCPFDLAST2020!ZKBD202011001034!2!14&displaymode=Refworks&orderparam=0&ordertype=desc&selectfield=&random=0.9317799522629542
    let postData = ids.reduce((a, b, c) => a + b.dbname + "!" + b.filename + "!" + (c + 1) + "!8%2C", "filename=")
        .replace(/%2C$/g, "")
        + "&displaymode=Refworks&orderparam=0&ordertype=desc&selectfield=&random=0.9317799522629542";
    return postData;
}

export function createSearchPostData(fileData: any) {
    let searchKeyword = fileData.keyword.replace(/ /g, '+');
    let searchIdx = 1;
    let queryJson = {
        Platform: "",
        DBCode: "SCDB",
        KuaKuCode:
            "CJFQ,CDMD,CIPD,CCND,CYFD,SCOD,CISD,SNAD,BDZK,GXDB_SECTION,CJFN,CCJD",
        QNode: {
            QGroup: [
                {
                    Key: "Subject",
                    Title: "",
                    Logic: 4,
                    Items: [],
                    ChildItems: [],
                },
                {
                    Key: "ControlGroup",
                    Title: "",
                    Logic: 1,
                    Items: [],
                    ChildItems: [],
                }
            ],
        },
    };
    if (fileData.keyword) {
        // 如果标题中含有空格，增加主题关键词搜索
        if (fileData.keyword.includes(" ")) {
            let titleChildItem = {
                Key: `input[data-tipid=gradetxt-${searchIdx}]`,
                Title: "主题",
                Logic: 4,
                Items: [
                    {
                        Key: "",
                        Title: searchKeyword,
                        Logic: 0,
                        Name: "SU",
                        Operate: "%=",
                        Value: searchKeyword,
                        ExtendType: 1,
                        ExtendValue: "中英文对照",
                        Value2: ""
                    }
                ],
                ChildItems: []
            };
            queryJson.QNode.QGroup[0].ChildItems.push(titleChildItem as never);
            searchIdx += 1;
        }

        let titleChildItem = {
            Key: `input[data-tipid=gradetxt-${searchIdx}]`,
            Title: "篇名",
            Logic: 2,
            Items: [
                {
                    Key: "",
                    Title: searchKeyword,
                    Logic: 1,
                    Name: "TI", // 搜索字段代码
                    Operate: fileData.keyword.includes(" ") ? "%" : "=", // =精确匹配, % 模糊匹配
                    Value: searchKeyword,
                    ExtendType: 1,
                    ExtendValue: "中英文对照",
                    Value2: "",
                },
            ],
            ChildItems: [],
        };
        queryJson.QNode.QGroup[0].ChildItems.push(titleChildItem as never);
        searchIdx += 1;
    }
    if (fileData.author) {
        let authorChildItem = {
            Key: `input[data-tipid=gradetxt-${searchIdx}]`,
            Title: "作者",
            Logic: 1,
            Items: [
                {
                    Key: "",
                    Title: fileData.author,
                    Logic: 1,
                    Name: "AU",
                    Operate: "=",
                    Value: fileData.author,
                    ExtendType: 1,
                    ExtendValue: "中英文对照",
                    Value2: "",
                },
            ],
            ChildItems: [],
        };
        queryJson.QNode.QGroup[0].ChildItems.push(authorChildItem as never);
        searchIdx += 1;
    }
    const postData =
        "IsSearch=true&QueryJson=" +
        encodeURIComponent(JSON.stringify(queryJson)) +
        "&PageName=DefaultResult&DBCode=SCDB" +
        "&KuaKuCodes=CJFQ%2CCCND%2CCIPD%2CCDMD%2CCYFD%2CBDZK%2CSCOD%2CCISD%2CSNAD%2CCCJD%2CGXDB_SECTION%2CCJFN" +
        "&CurPage=1&RecordsCntPerPage=20&CurDisplayMode=listmode" +
        "&CurrSortField=&CurrSortFieldType=desc&IsSentenceSearch=false&Subject=";
    return postData;
}

/**
 * Search CNKI by PDF filename and author name, and get selected articles
 * @param fileData 
 */

export async function searchCNKI(fileData: any): Promise<ResultRow[]> {
    Zotero.debug("**Jasminum start search");
    const postData = createSearchPostData(fileData);
    const requestHeaders = {
        Accept: "text/html, */*; q=0.01",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7",
        Connection: "keep-alive",
        "Content-Length": "2085",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Host: "kns.cnki.net",
        Origin: "https://kns.cnki.net",
        Referer:
            "https://kns.cnki.net/kns8/AdvSearch?dbprefix=SCDB&&crossDbcodes=CJFQ%2CCDMD%2CCIPD%2CCCND%2CCISD%2CSNAD%2CBDZK%2CCJFN%2CCCJD",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "X-Requested-With": "XMLHttpRequest",
    };
    const postUrl = "https://kns.cnki.net/KNS8/Brief/GetGridTableHtml";
    // Zotero.debug(Zotero.Jasminum.CookieSandbox);
    const resp = await Zotero.HTTP.request("POST", postUrl, {
        headers: requestHeaders,
        cookieSandbox: addon.data.cookieBox.searchCookieBox,
        body: postData,
    });
    // Zotero.debug(resp.responseText);
    // targetRows
    const html = string2HTML(resp.responseText);
    const rows = html.querySelectorAll(
        "table.result-table-list > tbody > tr"
    );
    Zotero.debug("**Jasminum search CNKI results: " + rows.length);
    let targetRows: ResultRow[] = [];
    if (rows.length == 0) {
        Zotero.debug("**Jasminum No items found.");
        return targetRows;
    } else {
        for (let idx = 0; idx < rows.length; idx++) {
            let rowText = rows[idx].textContent!.split(/\s+/).join(" ");
            let href = rows[idx].querySelector("a.fz14")?.getAttribute("href")!;
            let citation = rows[idx].querySelector(".quote")!.getAttribute("innerText")!.trim();
            let id = getIDFromURL(href) as CNKIID;
            targetRows.push({ url: href, id: id, title: rowText, citation: citation });
            Zotero.debug(rowText);
        }
    }
    let resusltRows = selectRows(targetRows);
    return resusltRows;
}


/**
 * Get Citation number from article page
 * @param {document} 
 * @return {string} Citation number
 */
export function getCitationFromPage(html: Document): string {
    let citenode = html.querySelector("input#paramcitingtimes");
    return citenode ? citenode.getAttribute('value')! : "";
}

/**
 * Get Chinese Social Science Citation Information
 * @param {document}
 * @return {string} 
 */
export function getCSSCI(html: Document): string {
    var cssci = html.querySelectorAll("a.type");
    if (cssci.length > 0) {
        return Array.prototype.map.call(cssci, ele => ele.innerText).join(", ");
    } else {
        return "";
    }
}


// Get refwork text data from search target rows
export async function getRefworksText(targetIDs: CNKIID[]): Promise<string> {
    // let targetIDs: CNKIID[] = resultRows.reduce((p:CNKIID[], c) => {p.push(c.id); return p}, []);
    let postData = createRefPostData(targetIDs);
    Zotero.debug(postData);
    let url = "https://kns.cnki.net/KNS8/manage/ShowExport";
    let resp = await Zotero.HTTP.request("POST", url, {
        cookieSandbox: addon.data.cookieBox.refCookieBox,
        body: postData,
    });
    return resp.responseText
        .replace("<ul class='literature-list'><li>", "")
        .replace("<br></li></ul>", "")
        .replace("</li><li>", "") // divide results
        .replace(/<br>|\r/g, "\n")
        .replace(/vo (\d+)\n/, "VO $1\n") // Divide VO and IS to different line
        .replace(/IS 0(\d+)\n/g, "IS $1\n")  // Remove leading 0
        .replace(/VO 0(\d+)\n/g, "VO $1\n")
        .replace(/\n+/g, "\n")
        .replace(/\n([A-Z][A-Z1-9]\s)/g, "<br>$1")
        .replace(/\n/g, "")
        .replace(/<br>/g, "\n")
        .replace(/\t/g, "") // \t in abstract
        .replace(
            /^RT\s+Conference Proceeding/gim,
            "RT Conference Proceedings"
        )
        .replace(/^RT\s+Dissertation\/Thesis/gim, "RT Dissertation")
        .replace(/^(A[1-4]|U2)\s*([^\r\n]+)/gm, function (m: any, tag: any, authors: any) {
            authors = authors.split(/\s*[;，,]\s*/); // that's a special comma
            if (!authors[authors.length - 1].trim()) authors.pop();
            return tag + " " + authors.join("\n" + tag + " ");
        })
        .trim();
}


//########################
// For Adding bookmark
//########################

export function getReaderUrl(itemUrl: string) {
    Zotero.debug("** Jasminum get Reader url.");
    var itemid = getIDFromURL(itemUrl) as CNKIID;
    var readerUrl =
        "https://kreader.cnki.net/Kreader/CatalogViewPage.aspx?dbCode=" +
        itemid.dbcode +
        "&filename=" +
        itemid.filename +
        "&tablename=" +
        itemid.dbname +
        "&compose=&first=1&uid=";
    return readerUrl;
}

export async function getChapterUrl(readerUrl: string) {
    var reader = await Zotero.HTTP.request("GET", readerUrl);
    var readerHTML = string2HTML(reader.responseText);
    return (
        "https://kreader.cnki.net/Kreader/" +
        readerHTML.querySelector("iframe")!.getAttribute("src")
    );
}

export async function getChapterText(chapterUrl: string, item: Zotero.Item) {
    const key = item.key;
    const lib = item.libraryID;
    let chapterHTML = await getHTMLDoc(chapterUrl);
    let tree = chapterHTML.getElementById("treeDiv");
    let rows = tree!.querySelectorAll("tr");
    let rows_array = [];
    let note = "";
    for (let row of rows) {
        Zotero.debug(row.textContent!.trim());
        let cols = row.querySelectorAll("td");
        const level = cols.length - 1;
        let title = row.textContent!.trim();
        let onclickText = cols[cols.length - 1]
            .querySelector("a")!
            .getAttribute("onclick");
        const pageRex = onclickText!.match(/CDMDNodeClick\('(\d+)'/);
        const page = pageRex![1];
        const bookmark = `BookmarkBegin\nBookmarkTitle: ${title}\nBookmarkLevel: ${level}\nBookmarkPageNumber: ${page}`;
        rows_array.push(bookmark);
        note += `<li style="padding-top: ${level == 1 ? 4 : 8
            }px; padding-left: ${12 * (level - 1)
            }px"><a href="zotero://open-pdf/${lib}_${key}/${page}">${title}</a></li>\n`;
    }
    note =
        '<p id="title"><strong>Contents</strong></p>\n' +
        '<ul id="toc" style="list-style-type: none; padding-left: 0px">\n' +
        note +
        "</ul>";
    return [rows_array.join("\n"), note];
}

// Find chapter page number from CNKI reader side bar.
export async function getBookmark(item: Zotero.Item) {
    // demo url     https://kreader.cnki.net/Kreader/buildTree.aspx?dbCode=cdmd&FileName=1020622678.nh&TableName=CMFDTEMP&sourceCode=GHSFU&date=&year=2020&period=&fileNameList=&compose=&subscribe=&titleName=&columnCode=&previousType=_&uid=
    let parentItem = item.parentItem as Zotero.Item;
    let itemUrl: string = '';
    let itemReaderUrl: string;
    let itemChapterUrl: string;
    let parentItemUrl = parentItem.getField("url") as string;
    if (  // CNKI reader URL exists
        parentItemUrl &&
        parentItemUrl.includes("Kreader/CatalogView")
    ) {
        itemReaderUrl = parentItemUrl;
    } else if (
        // 匹配知网 URL
        parentItemUrl &&
        parentItemUrl.match(/^https?:\/\/kns\.cnki\.net/) &&// Except nxgp.cnki.net
        getIDFromURL(parentItemUrl) // A valid ID
    ) {
        Zotero.debug("** Jasminum item url exists");
        itemReaderUrl = getReaderUrl(parentItemUrl);
    } else {
        Zotero.debug("Jasminum search for item url");
        var fileData = {
            keyword: parentItem.getField("title"),
            author:
                parentItem.getCreator(0).lastName! +
                parentItem.getCreator(0).firstName,
        };
        var targetRows = await searchCNKI(fileData);
        if (targetRows == null) {
            return null;
        }
        // Frist row in search table is selected.
        itemUrl = targetRows![0].url;
        itemUrl = "https://kns.cnki.net/KCMS" + itemUrl.slice(4);
        itemReaderUrl = getReaderUrl(itemUrl);
        // 获取文献链接URL -> 获取章节目录URL
    }
    Zotero.debug("** Jasminum item url: " + itemUrl);
    Zotero.debug("** Jasminum item reader url: " + itemReaderUrl);
    itemChapterUrl = await getChapterUrl(itemReaderUrl);
    Zotero.debug("** Jasminum item chapter url: " + itemChapterUrl);
    // Next line raises: Invalid chrome URI: /
    var out = getChapterText(itemChapterUrl, item);
    return out;
}


export async function addBookmark(item: Zotero.Item, bookmark: string) {
    Zotero.debug("** Jasminum add bookmark begin");
    // Zotero.debug(item);
    let cacheFile = Zotero.getTempDirectory();
    let cachePDF = Zotero.getTempDirectory();
    // PDFtk will throw errors when args contains Chinese character
    // So create a tmp folder.
    if (Zotero.isWin) {
        var newTmp = OS.Path.join(cacheFile.path.slice(0, 3), "tmp");
        Zotero.debug("** Jasminum new tmp path " + newTmp);
        cacheFile = Zotero.getTempDirectory();
        cachePDF = Zotero.getTempDirectory();
        cacheFile.initWithPath(newTmp);
        cachePDF.initWithPath(newTmp);
        if (!cacheFile.exists()) {
            cacheFile.create(
                Components.interfaces.nsIFile.DIRECTORY_TYPE,
                777
            );
        }
    }
    cacheFile.append("bookmark.txt");
    if (cacheFile.exists()) {
        cacheFile.remove(false);
    }

    cachePDF.append("output.pdf");
    if (cachePDF.exists()) {
        cachePDF.remove(false);
    }

    let encoder = new TextEncoder();
    let array = encoder.encode(bookmark);
    await OS.File.writeAtomic(cacheFile.path, array, {
        tmpPath: cacheFile.path + ".tmp",
    });
    let pdftk = Zotero.Prefs.get("jasminum.pdftkpath") as string;
    if (Zotero.isWin) {
        pdftk = OS.Path.join(pdftk, "pdftk.exe");
    } else {
        pdftk = OS.Path.join(pdftk, "pdftk");
    }
    Zotero.debug("** Jasminum pdftk path: " + pdftk);
    var args = [
        item.getFilePath(),
        "update_info_utf8",
        cacheFile.path,
        "output",
        cachePDF.path,
    ] as string[];
    Zotero.debug(
        "PDFtk: Running " +
        pdftk +
        " " +
        args.map((arg) => "'" + arg + "'").join(" ")
    );
    try {
        await Zotero.Utilities.Internal.exec(pdftk, args);
        await OS.File.copy(cachePDF.path, item.getFilePath() as string);
        cacheFile.remove(false);
        cachePDF.remove(false);
        Messager.showPopup(
            "学位论文书签",
            `${item.attachmentFilename} 书签添加成功`
        );
    } catch (e) {
        Zotero.logError(e as Error);
        try {
            cacheFile.remove(false);
            cachePDF.remove(false);
        } catch (e) {
            Zotero.logError(e as Error);
        }
        Messager.showPopup(
            "Error in adding bookmark",
            `PDFtk 添加书签时失败, ${e}`,
            2
        )
    }
}

export async function checkPath() {
    Zotero.debug("** Jasminum check path.");
    const pdftkpath = Zotero.Prefs.get("jasminum.pdftkpath") as string;
    Zotero.debug(pdftkpath);
    var pdftk = "";
    if (Zotero.isWin) {
        pdftk = OS.Path.join(pdftkpath, "pdftk.exe");
    } else {
        pdftk = OS.Path.join(pdftkpath, "pdftk");
    }
    Zotero.debug(pdftk);
    var fileExist = await OS.File.exists(pdftk);
    Zotero.debug(fileExist);
    return fileExist;
}

/**
 * Import attachment from CNKI, and added to item.
 * @param {Zotero.item}
 * @return {void}
 */
export async function importAttachment(item: Zotero.Item) {
    Zotero.debug("** Jasminum import attachment begin");
    let articleID = await getCNKIID(item.getField("url") as string);
    if (!articleID) { // 从网址获取ID失败，使用查询结果
        Messager.showPopup(
            "知网下载链接查询失败",
            `知网超时验证,可能抓取信息时出现验证码`,
            1);
        return;
    }
    let articleUrl = getURLFromID(articleID as CNKIID, true);
    let attachmentUrl = await getAttachmentURL(articleUrl)
    let cookie = Zotero.Prefs.get("jasminum.cnki.attachment.cookie");
    let attachmentType = Zotero.Prefs.get("jasminum.attachment");
    if (cookie === undefined) {
        Messager.showPopup(
            "知网用户数据获取异常",
            `请先在茉莉花设置 -> 获取知网用户数据 -> 输入知网网址 -> 点击获取按钮`,
            1);
        return;
    }
    if (attachmentUrl === undefined) {
        Messager.showPopup(
            "未查询到附件!",
            `文章：${item.getField("title")}\n   未查询到附件`,
            1);
        return;
    }
    Zotero.debug("** Jasminum attachment url: " + attachmentUrl);

    var importOptions = {
        libraryID: item.libraryID,
        url: attachmentUrl,
        parentItemID: item.id,
        title: `Full_Text_by_Jasminum.${attachmentType}`,
        fileBaseName: "Full_Text_by_Jasminum",
        contentType: `application/${attachmentType}`,
        referrer: 'https://kns.cnki.net/kns8/defaultresult/index',
        cookieSandbox: addon.data.cookieBox.attachmentCookieBox,
    };
    // return attachment Item
    try {
        var result = await Zotero.Attachments.importFromURL(importOptions)
        Zotero.debug(result);
        Messager.showPopup(
            "下载成功!",
            `文章：${item.getField("title")}\n 下载成功 `,
            0);
    } catch (e) {
        Messager.showPopup(
            "附件下载失败!",
            "可能是用户信息失效，没有下载权限或出现验证码，下载的附件是网页",
            1);
    }
}

/**
 * Get attachment url from item.
 * @param {String} article url
 * @return {string}, attachment url
*/
export async function getAttachmentURL(articleUrl: string) {
    let html = await getHTMLDoc(articleUrl);
    let attachment;
    switch (Zotero.Prefs.get("jasminum.attachment")) {
        case "pdf":
            attachment = html.getElementById("pdfDown1") || html.getElementById("pdfDown");
            break;
        case "caj":
            attachment = html.getElementById("cajDown");
            break
    }
    if (attachment) {
        return "https://oversea.cnki.net" + attachment.getAttribute("href")!.trim();
    }
}

/**
## 知网参考文献抓取
 */

/**
 * Get search parameters from html header
 * @param {HTMLDocument} HTML Object
 * @return {String} Value listv in html header
 */
export function getVlistFromPage(html: Document) {
    return html.querySelector("input#listv")!.getAttribute("value");
}


export async function getRefIDs(url: string) {
    let htmlDocument = await getHTMLDoc(url);
    let listv = getVlistFromPage(htmlDocument);
    let cnkiID = getIDFromPage(htmlDocument) as CNKIID;
    let getUrl = "https://kns.cnki.net/kcms/detail/frame/list.aspx"
        + `?dbcode=${cnkiID.dbcode}&filename=${cnkiID.filename}&dbname=${cnkiID.dbname}&RefType=1&vl=${listv}`;
    const host = "kns.cnki.net";
    let resp = await Zotero.HTTP.request("GET", getUrl, { headers: { Host: host, Referer: url } });
    return resp.responseText;
}


/**
 * Zotero Menu functions
 */

export async function searchCNKIForItems() {
    let items = ZoteroPane.getSelectedItems();
    if (items.length == 0) {
        Zotero.debug("** Jasminum search CNKI, no items seleted!");
        return;
    }

    for (let item of items) {
        let itemCollections = item.getCollections();
        let libraryID = item.libraryID;
        // Retrive meta data from CNKI webpage item
        if (Zotero.ItemTypes.getName(item.itemTypeID) === "webpage") {
            Zotero.debug("** Jasminum search CNKI, for CNKI webpage");
            let articleID = getIDFromURL(item.getField("url") as string) as CNKIID;
            let data = await getRefworksText([articleID]);
            // Some item will be updated after published
            if (data.length === 0 && articleID.dbname.includes("TEMP")) {
                Zotero.debug("** Jasminum search CNKI, trying to get CNKIID from page");
                articleID = await getCNKIID(item.getField("url") as string, true) as CNKIID;
            }
            data = await getRefworksText([articleID]);
            let newItems = await trans2Items(data, libraryID);
            let targetData = {
                targetUrls: [item.getField("url")],
                citations: [null]
            };
            newItems = await fixItem(newItems, targetData);
            // Keep the same collection in newItem.
            if (itemCollections.length) {
                for (let collectionID of itemCollections) {
                    for (let i of newItems) {
                        i.addToCollection(collectionID);
                        await i.saveTx();
                    };
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
            Zotero.debug("** Jasminum search CNKI, for PDF file");
            let fileData = splitFilename(item.attachmentFilename);
            Zotero.debug(fileData);
            var targetRows = await searchCNKI(fileData);
            // 有查询结果返回
            if (targetRows && targetRows.length > 0) {
                let data = await getRefworksText(targetRows.map( (e) => e.id));
                let newItems = await trans2Items(data, libraryID);
                Zotero.debug(newItems);
                let targetData = {
                    targetUrls: targetRows.map( (e) => e.url),
                    citations: targetRows.map( (e) => e.citation)
                }
                newItems = await fixItem(newItems, targetData);
                if (itemCollections.length) {
                    for (let collectionID of itemCollections) {
                        newItems.forEach(function (item: any) {
                            item.addToCollection(collectionID);
                        });
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
                    newItems.forEach(function (newItem: Zotero.Item) {
                        item.addRelatedItem(newItem);
                    });
                    await item.saveTx();
                }

                Zotero.debug("** Jasminum finished.");
            } else {
                Messager.showPopup(
                    "未查询到结果",
                    "可以文件名模板与实际文件名不符",
                    1);
            }
        }
    }
}