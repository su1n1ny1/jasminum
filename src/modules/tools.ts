import { getItems } from "./utils";
import { guess } from "./nlp";

// Functions used in menu
export async function concatName(type: string) {
    let items = getItems(type);
    const isSplitEnName = Zotero.Prefs.get("jasminum.ennamesplit");
    for (let item of items) {
        let creators = item.getCreators();
        for (let i = 0; i < creators.length; i++) {
            let creator = creators[i];
            creator.fieldMode = 1;
            if (
                // English Name
                creator.lastName!.search(/[A-Za-z]/) !== -1 ||
                creator.lastName!.search(/[A-Za-z]/) !== -1
            ) {
                // 如果不拆分/合并英文名，则跳过
                if (!isSplitEnName) continue;
                creator.lastName = creator.firstName + " " + creator.lastName;
            } else {
                // For Chinese Name
                creator.lastName = creator.lastName! + creator.firstName;
            }
            creator.firstName = "";
            creator.fieldMode = 1; // 0: two-field, 1: one-field (with empty first name)
            creators[i] = creator;
        }
        if (creators != item.getCreators()) {
            item.setCreators(creators);
            await item.saveTx();
        }
    }
}

export async function splitName(type: string) {
    let items = getItems(type);
    const isSplitEnName = Zotero.Prefs.get("jasminum.ennamesplit");
    for (let item of items) {
        let creators = item.getCreators();
        for (let i = 0; i < creators.length; i++) {
            let creator = creators[i];
            creator.fieldMode = 0;
            if (
                // English Name
                (creator.lastName!.search(/[A-Za-z]/) >= 0 ||
                    creator.firstName!.search(/[A-Za-z]/) >= 0) &&
                creator.firstName === "" // 名为空
            ) {
                // 如果不拆分/合并英文名，则跳过
                if (!isSplitEnName) continue;
                let EnglishName = creator.lastName;
                let temp = EnglishName!.split(/[\n\s+,]/g).filter(Boolean); // 过滤空字段
                creator.lastName = temp.pop();
                creator.firstName = temp.join(" ");
            } else if (creator.firstName === "") {
                // For Chinese Name,名为空
                let chineseName = creator.lastName || creator.firstName;
                creator.lastName = chineseName.charAt(0);
                creator.firstName = chineseName.substr(1);
            }
            creator.fieldMode = 0; // 0: two-field, 1: one-field (with empty first name)
            creators[i] = creator;
        }
        if (creators != item.getCreators()) {
            item.setCreators(creators);
            await item.saveTx();
        }
    }
}

/**
 * 在知网搜索结果列表添加文献时，可能导致该文献的作者名变成类似于 姓名;姓名;姓名 的形式，
 * 使用此函数将分号分隔的姓名分隔到不同的条目中。
 */
export async function splitSemicolonNames(type: string) {
    let items = getItems(type);
    for (let item of items) {
        const creators = item.getCreators();
        var newlist = [];
        for (let creator of creators) {
            if (creator.lastName!.search(";") && creator.firstName === "") {
                const names = creator
                    .lastName!.split(";")
                    .filter((s) => s !== "");
                for (let name of names) {
                    newlist.push({
                        firstName: "",
                        lastName: name,
                        creatorType: "author",
                    });
                }
            } else {
                newlist.push(creator);
            }
        }
        if (newlist !== creators) {
            item.setCreators(newlist);
            await item.saveTx();
        }
    }
}

/**
 * Remove comma in filename
 */
export async function removeComma(type: string) {
    let items = getItems(type);
    for (let item of items) {
        let attachmentIDs = item.getAttachments();
        for (let id of attachmentIDs) {
            let atta = Zotero.Items.get(id);
            let newName = atta.attachmentFilename.replace(
                /([_\u4e00-\u9fa5]),\s+([_\u4e00-\u9fa5])/g,
                "$1$2"
            );
            await atta.renameAttachmentFile(newName);
            atta.setField("title", newName);
            await atta.saveTx();
        }
    }
}

/**
 * Set default language value in item field
 * @param {[Zotero.item]}
 * @return {void}
 */
export async function manualSetLanguage(type: string) {
    let items = getItems(type);
    const defaultLanguage = Zotero.Prefs.get("jasminum.language") as string;
    for (let item of items) {
        if (item.getField("language") != defaultLanguage) {
            item.setField("language", defaultLanguage);
            await item.saveTx();
        }
    }
}

/**
 * Uniform date format
 * Inspired by https://forums.zotero.org/discussion/84444/date-formats
 * date format https://www.w3schools.com/js/js_date_formats.asp
 * @param {[Zotero.item]}
 * @return {void}
 */
export async function dateFormatter(type: string) {
    let items = getItems(type, true);
    const dateFormat = Zotero.Prefs.get("jasminum.dateformatter");
    const isFill = Zotero.Prefs.get("jasminum.dateformatterfill");
    let separator = dateFormat == "ISO" ? "-" : "/";
    for (let item of items) {
        let oldDate = item.getField("date");
        let dateJSON = Zotero.Date.strToDate(oldDate);
        let newDate = "";
        if (dateFormat == "yearOnly") {
            newDate = dateJSON.year;
        } else {
            // month 以 0 开始
            let newMonth = dateJSON.month + 1;
            let newDay = dateJSON.day;
            if (isFill) {
                // 当 month，day 小于 10 时，在前补 0
                newMonth = ("0" + newMonth).slice(-2);
                newDay = ("0" + dateJSON.day).slice(-2);
            }
            let dateList = [dateJSON.year, newMonth, newDay];
            if (dateFormat == "short") dateList.reverse();
            // 去除日期数组里 undefined, NaN
            newDate = dateList.filter((x) => Number(x)).join(separator);
        }
        if (newDate && newDate != oldDate) {
            item.setField("date", newDate);
            await item.saveTx();
        }
    }
}

/**
 * Batch Set language using nlp.js
 * @param {[Zotero.item]}
 * @return {void}
 */
export async function autoSetLanguage(type: string) {
    let items = getItems(type, true);
    // 获取常用语言列表
    const languageStr = (
        Zotero.Prefs.get("jasminum.languagelist") as string
    ).replace(/\s*/g, "");
    let languageList = languageStr.split(/,|，/g);
    // 使用 nlp.js 进行识别
    for (let item of items) {
        let langGuess = guess(item.getField("title"), languageList)[0][
            "alpha2"
        ];
        if (langGuess && item.getField("language") != langGuess) {
            item.setField("language", langGuess);
            await item.saveTx();
        }
    }
}
