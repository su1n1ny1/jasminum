import { config } from "../../package.json";


class Scrape {
    userAgent: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
    cnkiUrl = "https://cnki.net/";
    searchCookieData = 
        "Ecp_ClientId=1200104193103044969; RsPerPage=20; " +
        "cnkiUserKey=60c42f4d-35a2-6d3f-6efc-ad01eaffd4c3; " +
        "_pk_ref=%5B%22%22%2C%22%22%2C1604497317%2C%22https%3A%2F%2Fcnki.net%2F%22%5D; " +
        "ASP.NET_SessionId=zcw1abnl5vitqcliiq5almmj; " +
        "SID_kns8=123121; " +
        "Ecp_IpLoginFail=20110839.182.10.65";
    refCookieData = 
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
    attachCookieData: string;
    searchCookieSandbox: any;
    refCookieSandbox: any;
    attachCookieSandbox: any;

    constructor() {
        this.attachCookieData = Zotero.Prefs.get("jasminum.cnki.attachment.cookie") as string;
        this.searchCookieSandbox = new Zotero.CookieSandbox("", this.cnkiUrl, this.searchCookieData, this.userAgent);
        this.refCookieSandbox = new Zotero.CookieSandbox("", this.cnkiUrl, this.refCookieData, this.userAgent);
        this.attachCookieSandbox = new Zotero.CookieSandbox("", this.cnkiUrl, this.attachCookieData, this.userAgent);
    }

    

    updateAttachCookieData() {

    }

    updateAttachCookieSandbox() {

    }
/**
 * 
 * @param {[id]} ids Array of CNKI article ID {Array}
 * @returns {string} Post data string
 */
    createRefPostData(ids: {dbname: string, filename: string}[]): string {
        let postData = "filename=";
        // filename=CPFDLAST2020!ZGXD202011001016!1!14%2CCPFDLAST2020!ZKBD202011001034!2!14&displaymode=Refworks&orderparam=0&ordertype=desc&selectfield=&random=0.9317799522629542
        for (let idx = 0; idx < ids.length; idx++) {
            postData =
                postData +
                ids[idx].dbname +
                "!" +
                ids[idx].filename +
                "!" +
                (idx + 1) +
                "!8%2C";
        }
        postData = postData.replace(/%2C$/g, "");
        postData +=
            "&displaymode=Refworks&orderparam=0&ordertype=desc&selectfield=&random=0.9317799522629542";
        return postData;
    }

    createSearchPostData(fileData: {author: string, keyword: string}): string {
        let searchKeyword = fileData.keyword.replace(/ /g, '+');
        let searchIdx = 1;
        let titleChildItem: any = {};
        let childItems: any[] = [];
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
                        // ChildItems: [],
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
                titleChildItem = {
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
                childItems.push(titleChildItem);
                // queryJson.QNode.QGroup[0].ChildItems.push(titleChildItem);
                searchIdx += 1;
            }

            titleChildItem = {
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
            childItems.push(titleChildItem);
            // queryJson.QNode.QGroup[0].ChildItems.push(titleChildItem);
            searchIdx += 1;
        }
        if (fileData.author) {
            var authorChildItem = {
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
            childItems.push(titleChildItem);
            // queryJson.QNode.QGroup[0].ChildItems.push(authorChildItem);
            searchIdx += 1;
        }
        queryJson.QNode.QGroup[0]['ChildItems'] = childItems;
        var postData =
            "IsSearch=true&QueryJson=" +
            encodeURIComponent(JSON.stringify(queryJson)) +
            "&PageName=DefaultResult&DBCode=SCDB" +
            "&KuaKuCodes=CJFQ%2CCCND%2CCIPD%2CCDMD%2CCYFD%2CBDZK%2CSCOD%2CCISD%2CSNAD%2CCCJD%2CGXDB_SECTION%2CCJFN" +
            "&CurPage=1&RecordsCntPerPage=20&CurDisplayMode=listmode" +
            "&CurrSortField=&CurrSortFieldType=desc&IsSentenceSearch=false&Subject=";
        return postData;
    }

}