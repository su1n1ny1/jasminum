import { config } from "../../package.json";

/**
 * 
 * @param filename Attachment filename
 * @returns {author: Author name, Chinese Lastname with firstname
 *  keyword: Article title
 * }
 */
export function splitFilename(filename: string) {
    // Make query parameters from filename
    let patent = Zotero.Prefs.get("jasminum.namepatent") as string;
    let prefix = filename.replace(/\.\w+$/, '')  // 删除文件后缀
        .replace(/\.ashx$/g, "") // 删除末尾.ashx字符
        .replace(/^_|_$/g, '');  // 删除前后的下划线
    // 当文件名模板为"{%t}_{%g}"，文件名无下划线_时，将文件名认定为标题
    if (patent === "{%t}_{%g}" && !prefix.includes("_")) {
        return {
            author: "",
            keyword: prefix,
        };
    }
    let patentSepArr = patent!.split(/{%[^}]+}/);
    let patentSepRegArr = patentSepArr.map(x => x.replace(/([\[\\\^\$\.\|\?\*\+\(\)])/g, '\\$&'));
    let patentMainArr = patent.match(/{%[^}]+}/g);
    //文件名中的作者姓名字段里不能包含下划线，请使用“&,，”等字符分隔多个作者，或仅使用第一个作者名（加不加“等”都行）。
    let patentMainRegArr = patentMainArr!.map(x => x.replace(/.+/, /{%y}/.test(x) ? '(\\d+)' : (/{%g}/.test(x) ? '([^_]+)' : '(.+)')));
    let regStrInterArr = patentSepRegArr.map((_, i) => [patentSepRegArr[i], patentMainRegArr[i]]);
    let patentReg = new RegExp([].concat.apply([], regStrInterArr).filter(Boolean).join(''), 'g');

    let prefixMainArr = patentReg.exec(prefix);
    // 文件名识别结果为空，跳出警告弹窗
    if (prefixMainArr === null) {
        this.Utils.showPopup(
            "Error in parsing filename",
            `文件名识别出错，请检查文件名识别模板与实际抓取文件名。文件名: ${filename}，识别模板为: ${patent}`,
            1
        )
        return;
    }
    let titleIdx = patentMainArr.indexOf('{%t}');
    let authorIdx = patentMainArr.indexOf('{%g}');
    let titleRaw = (titleIdx != -1) ? prefixMainArr[titleIdx + 1] : '';
    let authors = (authorIdx != -1) ? prefixMainArr[authorIdx + 1] : '';
    let authorArr = authors.split(/[,，&]/);
    let author = authorArr[0]
    if (authorArr.length == 1) {
        //删除名字后可能出现的“等”字，此处未能做到识别该字是否属于作者姓名。
        //这种处理方式的问题：假如作者名最后一个字为“等”，例如：“刘等”，此时会造成误删。
        //于是对字符数进行判断，保证删除“等”后，至少还剩两个字符，尽可能地避免误删。

        author = (author.endsWith('等') && author.length > 2) ? author.substr(0, author.length - 1) : author;
    }

    //为了避免文件名中的标题字段里存在如下两种情况而导致的搜索失败:
    //原标题过长，文件名出现“_省略_”；
    //原标题有特殊符号（如希腊字母、上下标）导致的标题变动，此时标题也会出现“_”。
    //于是只取用标题中用“_”分割之后的最长的部分作为用于搜索的标题。

    //这种处理方式的问题：假如“最长的部分”中存在知网改写的部分，也可能搜索失败。
    //不过这只是理论上可能存在的情形，目前还未实际遇到。

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
    let title = titleRaw.replace("_省略_", ' ').replace("...", " ").replace(/_/g, " ");
    return {
        author: author,
        keyword: title,
    };
}