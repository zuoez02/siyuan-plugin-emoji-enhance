import { Dialog, Plugin, showMessage } from 'siyuan';
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
                    const n = (node as HTMLElement);
                    if (n.getAttribute('data-key') === 'dialog-emojis') {
                        const container = n.querySelector('.emojis');
                        this.setupContainer(container as HTMLElement);
                    }
                }

            }
        })
        const config = { attributes: false, childList: true, subtree: false };

        rootObserver.observe(document.body, config);

        this.unloadActions.push(() => rootObserver.disconnect());

        const protyleObserver = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                for (const node of mutation.addedNodes) {
                    const n = (node as HTMLElement);
                    if (n.classList.contains('emojis')) {
                        this.setupContainer(n);
                    }
                }
            }
        })

        this.eventBus.on('loaded-protyle-static', (event) => {
            const hint = event.detail.protyle.hint;
            if (hint) {
                protyleObserver.observe(hint.element, config);
                this.unloadActions.push(() => protyleObserver.disconnect);
            }
        });
    }

    unloadListeners() {
        this.unloadActions.forEach((f) => f());
    }

    onunload(): void {
        this.unloadListeners();
    }

    setupContainer(container: HTMLElement) {
        let searchBar: HTMLDivElement, emojiPanel: HTMLDivElement, bottomBar: HTMLDivElement;
        if (container.children.length === 3) {
            searchBar = container.children[0] as HTMLDivElement;
        }
        emojiPanel = container.querySelector('.emojis__panel')
        bottomBar = emojiPanel.nextElementSibling as HTMLDivElement;

        if (searchBar) {
            searchBar.insertAdjacentHTML('beforeend', `
        <span id="uploadButton" class="block__icon1 block__icon--show fn__flex-center b3-tooltips b3-tooltips__sw" aria-label="${window.siyuan.languages.upload}"><svg><use xlink:href="#iconUpload"></use></svg></span>
        <span class="fn__space"></span>
        <input type="file" id="uploadEmoji" multiple accept="image/*" style="display:none" />
        <span id="refreshButton" class="block__icon1 block__icon--show fn__flex-center b3-tooltips b3-tooltips__sw" aria-label="${window.siyuan.languages.refresh}"><svg><use xlink:href="#iconEmoji"></use></svg></span>
        <span class="fn__space"></span>
        <span id="urlButton" class="block__icon1 block__icon--show fn__flex-center b3-tooltips b3-tooltips__sw" aria-label="${this.i18n.loadFromUrl}"><svg><use xlink:href="#iconLanguage"></use></svg></span>
        <span class="fn__space"></span>`)

            const urlButton = searchBar.querySelector('#urlButton');
            urlButton.addEventListener('click', async () => {
                const result = await this.readUrlFromDialog();
                if (!result) {
                    return;
                }
                const url = result.value;
                const file = await this.downloadImage(url);
                if (!file) {
                    return;
                }
                const success = await this.saveImage(file);
                if (!success) {
                    return;
                }
                await this.refreshEmojis();
                const customPanel = emojiPanel.querySelector('div[data-type="1"]').nextElementSibling as HTMLDivElement;
                await this.updateCustomEmojiPanel(customPanel);
            });

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

        const customGroups = this.sortGroups(emojiPanel.querySelector('div[data-type="1"]').nextElementSibling as HTMLDivElement);
        if (emojiPanel && bottomBar) {
            this.setBottomGroup(bottomBar, customGroups);
        }
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
        this.resetCustomGroups(root);
        if (custom.items.length === 0) {
            root.setAttribute('style', 'min-height: 28px');
            root.innerHTML = `<div style="margin-left: 4px">${window.siyuan.languages.setEmojiTip}</div>`;
        } else {
            root.setAttribute('style', '');
            root.innerHTML = custom.items.map((v) => {
                return `<button class="emojis__item ariaLabel" aria-label="${v.description}" data-unicode="${v.unicode}"><img src="/emojis/${v.unicode}" /></button>`
            }).join('')
            const customGroups = this.sortGroups(root);
            this.setBottomGroup(root.parentElement.nextElementSibling as HTMLDivElement, customGroups);
        }
    }

    async refreshEmojis() {
        return fetch("/api/system/getEmojiConf", {
            method: 'POST',
        }).then(res => res.json()).then((data) => {
            window.siyuan.emojis = data.data;
        });
    }

    resetCustomGroups(root: HTMLDivElement) {
        root.parentElement.querySelectorAll('.custom-group').forEach((g) => {
            g.nextElementSibling.remove();
            g.remove();
        })
    }

    sortGroups(root: HTMLDivElement) {
        const groups: Map<string, HTMLButtonElement[]> = new Map();
        const noGroupButtons = [];
        root.querySelectorAll('button').forEach((button) => {
            const unicode = button.getAttribute('data-unicode');
            const path = unicode.split('/');
            if (path.length === 2) {
                const group = path[0];
                if (groups.has(group)) {
                    groups.get(group).push(button);
                } else {
                    groups.set(group, [button]);
                }
            } else {
                noGroupButtons.push(button);
            }
        });
        if (groups.size === 0) {
            return null;
        }
        groups.forEach((buttons, group) => {
            const head = document.createElement('div');
            head.classList.add('emojis__title', 'custom-group');
            head.setAttribute('data-type', group);
            head.textContent = group;
            const emojis = document.createElement('div');
            emojis.classList.add('emojis__content');
            buttons.forEach(b => emojis.appendChild(b));
            root.insertAdjacentElement('afterend', emojis);
            root.insertAdjacentElement('afterend', head);
        });
        return groups;
    }

    setBottomGroup(bottomBar: HTMLDivElement, groups: Map<string, HTMLButtonElement[]> | null) {
        if (!bottomBar) {
            return;
        }
        bottomBar.querySelectorAll('.custom-emoji-type').forEach(c => c.remove());
        if (!groups) {
            return;
        }
        const custom = bottomBar.querySelector('.emojis__type[data-type="1"]');
        groups.forEach((buttons, group) => {
            const newType = document.createElement('div');
            newType.classList.add('emojis__type', 'ariaLabel', 'custom-emoji-type');
            newType.setAttribute('data-type', group);
            newType.setAttribute('aria-label', group);
            let button = buttons.find((b) => {
                const dataUnicode = b.getAttribute('data-unicode');
                const t = dataUnicode.split('/')[1].split('.');
                const name = t.splice(t.length - 1, 1).join('');
                return name === 'thumb';
            }) || buttons[0];
            const dataUnicode = button.getAttribute('data-unicode');
            const url = `/emojis/${dataUnicode}`;
            const icon = `<img src="${url}">`
            newType.innerHTML = icon;
            custom.insertAdjacentElement('afterend', newType);
        });
    }

    async readUrlFromDialog(): Promise<{ value: string }> {
        return new Promise((resolve) => {
            const d = new Dialog({
                transparent: true,
                content: `<div class="b3-dialog-content" style="padding: 12px"><input id="emojiUrl" type="text" class="b3-input" style="width: 300px"><button id="confirm">${this.i18n.confirm}</button></div>`,
                disableAnimation: true,
                destroyCallback(options: { value: string } | null) {
                    resolve(options);
                },
            });


            const input = d.element.querySelector('#emojiUrl') as HTMLInputElement;
            input.focus();
            input.addEventListener('keyup', (e: KeyboardEvent) => {
                if (e.key.toLowerCase() === 'enter') {
                    d.destroy({ value: input.value });
                }
            });
            const button = d.element.querySelector('#confirm') as HTMLButtonElement;
            button.addEventListener('click', () => {
                d.destroy({ value: input.value });
            });
        })
    }

    async downloadImage(url) {
        if (!url) {
            return null;
        }
        return fetch(url).then(res => {
            if (res.headers.get('Content-Type').startsWith('image/')) {
                return res.blob();
            }
            throw Error('not an image');
        }).then((blob) => {
            const type = blob.type;
            return new File([blob], (window.Lute as any).NewNodeID() + '.' + type.split('/')[1]);
        }).catch((e) => {
            showMessage('emoji enhance: Download failed: ' + e);
            return null;
        })
    }

    async saveImage(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('isDir', 'false');
        formData.append('path', '/data/emojis/' + file.name);
        return fetch('/api/file/putFile', {
            method: 'POST',
            body: formData,
        }).then((res) => res.json()).then((res) => {
            if (res.code !== 0) {
                showMessage('emoji enhance: Save emoji failed');
                return false;
            }
            return true;
        }).catch((e) => {
            showMessage('emoji enhance: Save emoji failed');
            return false;
        })
    }
}