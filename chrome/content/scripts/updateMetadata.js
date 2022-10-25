/**
* @namespace Singleton to interface with the browser when ingesting data
*/

Jasminum_UpdateSelect = function () { };


Jasminum_UpdateSelect.init = function () {
    this.io = window.arguments[0];
    var box = document.getElementById("updateBox");
    box.addEventListener(
        "click",
        function (event) {
            var target = event.target;
            if (target.localName == 'label') {
                Zotero.debug(target.value)
            }
            if (!target)
                return;
        },
        false);
};

Jasminum_UpdateSelect.onAccept = function () {
    // Zotero.debug(this.io.old);
    // Zotero.debug(this.io.new);
    let oldTitle = this.io.old.getField("title");
    let newTitle = this.io.new.title;
    alert(oldTitle + "\n" + newTitle);
}
