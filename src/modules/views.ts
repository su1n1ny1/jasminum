import { getString } from "./locale";
import { config } from "../../package.json";

export class Views {
    static registerRightClickMenu() {
        const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
        // item menuitem with icon
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
                    icon: iconBaseUrl + 'searchCNKI.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.CNKI.updateCiteCSSCI.label"),
                    oncommand: "alert('menu.CNKI.updateCiteCSSCI.label')",
                    icon: iconBaseUrl + 'cssci.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.CNKI.attachment.label"),
                    oncommand: "alert('menu.CNKI.attachment.label')",
                    icon: iconBaseUrl + 'pdf.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.CNKI.addBookmark.label"),
                    oncommand: "alert('menu.CNKI.addBookmark.label')",
                    icon: iconBaseUrl + 'bookmark.png'
                }
            ]
        });

        ztoolkit.Menu.register("item", {
            tag: "menu",
            id: "jasminum-popup-menu-tools",
            label: getString("menu.tools.label"),
            icon: iconBaseUrl + "tools.png",
            children: [
                {
                    tag: "menuitem",
                    label: getString("menu.tools.namesplit.label"),
                    oncommand: "alert('menu.tools.namesplit.label')",
                    icon: iconBaseUrl + 'name.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.namemerge.label"),
                    oncommand: "alert('menu.tools.namemerge.label')",
                    icon: iconBaseUrl + 'name.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.semicolonNamesSplit.label"),
                    oncommand: "alert('menu.tools.semicolonNamesSplit.label')",
                    icon: iconBaseUrl + 'name.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.removeDot.label"),
                    oncommand: "alert('menu.tools.removeDot.label')",
                    icon: iconBaseUrl + 'bullet_yellow.png'
                }
                ,
                {
                    tag: "menuitem",
                    label: getString("menu.tools.bacthsetlanguage.label"),
                    oncommand: "alert('menu.tools.bacthsetlanguage.label')",
                    icon: iconBaseUrl + 'language.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.manualsetlanguage.label"),
                    oncommand: "alert('menu.tools.manualsetlanguage.label')",
                    icon: iconBaseUrl + 'flag-china.png'
                },
                {
                    tag: "menuitem",
                    label: getString("menu.tools.dateformatter.label"),
                    oncommand: "alert('menu.tools.dateformatter.label')",
                    icon: iconBaseUrl + 'date.png'
                }
            ]
        });
    }
}
