import { Plugin } from 'siyuan';
import "./index.scss";

export default class EmojiEnhancePlugin extends Plugin {
    unloadActions = [];

    onLayoutReady(): void {
        const rootObserver = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                if (!mutation.addedNodes.length) {
                    continue;
                }
                for (const node of mutation.addedNodes) {
                    if ((node as HTMLElement).getAttribute('data-key') === 'dialog-emojis') {
                        const container = (node as HTMLElement).querySelector('.emojis');
                        this.setupContainer(container as HTMLElement);
                    }
                }

            }
        })
        const config = { attributes: false, childList: true, subtree: false };

        rootObserver.observe(document.body, config);

        this.unloadActions.push(() => rootObserver.disconnect());
    }

    unloadListeners() {
        this.unloadActions.forEach((f) => f());
    }

    setupContainer(container: HTMLElement) {
        const searchBar = container.children[0] as HTMLDivElement;
        const emojiPanel = container.children[1] as HTMLDivElement;
        // const bottomBar = container.children[2] as HTMLDivElement;

        searchBar.insertAdjacentHTML('beforeend', `
        <span id="uploadButton" class="block__icon1 block__icon--show fn__flex-center b3-tooltips b3-tooltips__sw" aria-label="${window.siyuan.languages.upload}"><svg><use xlink:href="#iconUpload"></use></svg></span>
        <span class="fn__space"></span>
        <input type="file" id="uploadEmoji" multiple accept="image/*" style="display:none" />
        <span id="refreshButton" class="block__icon1 block__icon--show fn__flex-center b3-tooltips b3-tooltips__sw" aria-label="${window.siyuan.languages.refresh}"><svg><use xlink:href="#iconEmoji"></use></svg></span>
        <span class="fn__space"></span>`)

        const refreshButton = searchBar.querySelector('#refreshButton');
        refreshButton.addEventListener('click', async () => {
            const customPanel = emojiPanel.querySelector('div[data-type="1"]').nextElementSibling as HTMLDivElement;
            await this.updateCustomEmojiPanel(customPanel, true);
        });

        const uploadButton = searchBar.querySelector('#uploadButton');
        const uploadFileEl = searchBar.querySelector('#uploadEmoji') as HTMLInputElement;
        uploadButton.addEventListener('click', () => {
            uploadFileEl.click();
        });

        uploadFileEl.addEventListener('change', async () => {
            const files = [...uploadFileEl.files];
            uploadFileEl.value = "";
            await this.uploadEmoji(files);
            await this.refreshEmojis();
            const customPanel = emojiPanel.querySelector('div[data-type="1"]').nextElementSibling as HTMLDivElement;
            await this.updateCustomEmojiPanel(customPanel);
        });
    }

    uploadEmoji(files: File[]) {
        return Promise.all(files.map((f) => {
            const fd = new FormData();
            fd.append('path', '/data/emojis/' + f.name);
            fd.append('isDir', 'false');
            fd.append('file', f);
            return fetch('/api/file/putFile', {
                method: 'POST',
                body: fd,
            }).then((res) => res.json());
        }));
    }

    async updateCustomEmojiPanel(root: HTMLDivElement, refresh = false) {
        if (refresh) {
            await this.refreshEmojis();
        }
        const emojis = window.siyuan.emojis;
        const custom = emojis.find(v => v.id === 'custom');
        if (custom.items.length === 0) {
            root.setAttribute('style', 'min-height: 28px'); 
            root.innerHTML = `<div style="margin-left: 4px">${window.siyuan.languages.setEmojiTip}</div>`;
        } else {
            root.setAttribute('style', ''); 
            root.innerHTML = custom.items.map((v) => {
                return `<button class="emojis__item ariaLabel" aria-label="${v.description}" data-unicode="${v.unicode}"><img src="/emojis/${v.unicode}" /></button>`
            }).join('')
        }
    }

    async refreshEmojis() {
        return fetch("/api/system/getEmojiConf", {
            method: 'POST',
        }).then(res => res.json()).then((data) => {
            window.siyuan.emojis = data.data;
        });
    }
}