import { Dialog, Plugin, showMessage } from 'siyuan';
import "./index.scss";

export default class EmojiEnhancePlugin extends Plugin {
    unloadActions = [];

    onload() {
        this.addIcons(`<symbol id="iconRandom" viewBox="0 0 1024 1024"><path d="M753.564731 337.471035c-45.8697 0-160.259984 113.849978-243.789399 194.548928C383.134027 654.383848 263.508509 773.284865 167.764911 773.284865l-58.892295 0c-24.068162 0-43.581588-19.526729-43.581588-43.581588s19.513426-43.581588 43.581588-43.581588l58.892295 0c60.504002 0 183.002964-121.68134 281.432741-216.784348 119.79641-115.744117 223.254713-219.029482 304.368102-219.029482l56.209186 0-59.641355-57.828057c-17.033955-16.993023-17.060561-42.902112-0.057305-59.927881 17.002232-17.030885 44.596707-17.064654 61.631686-0.065492l134.207631 133.874033c8.192589 8.172123 12.794397 19.238157 12.794397 30.803563 0 11.564383-4.601808 22.604834-12.794397 30.776957L811.706943 461.72599c-8.505721 8.486278-19.646456 12.522198-30.78719 12.522198-11.166317 0-22.333658-4.676509-30.844495-13.199627-17.003256-17.025769-16.975627-45.432749 0.057305-62.425771l59.641355-61.151755L753.564731 337.471035zM811.706943 561.66105c-17.034978-16.999163-44.629453-16.972557-61.631686 0.058328-17.003256 17.024745-16.975627 46.257533 0.057305 63.250556l59.641355 61.150732-56.209186 0c-35.793204 0-95.590102-52.946886-154.87637-108.373243-17.576307-16.435321-45.161572-16.3422-61.594847 1.226944-16.444531 17.568121-15.523555 46.393633 2.053776 62.823837 90.322122 84.458577 151.246703 131.484613 214.417441 131.484613l56.209186 0-59.641355 57.824987c-17.033955 16.993023-17.060561 43.736107-0.057305 60.761875 8.511861 8.523117 19.678178 12.369725 30.844495 12.369725 11.140735 0 22.281469-4.453429 30.78719-12.939707L945.914574 757.311055c8.192589-8.173147 12.794397-19.315928 12.794397-30.881334 0-11.564383-4.601808-22.682605-12.794397-30.855752L811.706943 561.66105zM108.871593 337.471035l58.892295 0c45.932122 0 114.40154 58.455343 168.915108 107.942431 8.352225 7.576559 18.832927 12.140505 29.29214 12.140505 11.852956 0 23.673166-4.394077 32.270984-13.857613 16.182564-17.807574 14.859429-46.823422-2.958378-62.998823-85.247546-77.381391-156.561755-130.388652-227.519854-130.388652l-58.892295 0c-24.068162 0-43.581588 19.526729-43.581588 43.581588S84.804455 337.471035 108.871593 337.471035z" p-id="2326"></path></symbol>`)
    }

    onLayoutReady(): void {
        const rootObserver = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                if (!mutation.addedNodes.length) {
                    continue;
                }
                for (const node of mutation.addedNodes) {
                    const n = (node as HTMLElement);
                    if (n?.getAttribute('data-key') === 'dialog-emojis') {
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
        } else {
            searchBar = container.querySelector('.emojis__tabheader')
        }
        emojiPanel = container.querySelector('.emojis__panel')
        bottomBar = emojiPanel.nextElementSibling as HTMLDivElement;

        if (searchBar) {
            searchBar.insertAdjacentHTML('beforeend', `
        <span id="uploadButton" class="block__icon block__icon--show fn__flex-center b3-tooltips b3-tooltips__sw" aria-label="${window.siyuan.languages.upload}"><svg><use xlink:href="#iconUpload"></use></svg></span>
        <input type="file" id="uploadEmoji" multiple accept="image/*" style="display:none" />
        <span id="refreshButton" class="block__icon block__icon--show fn__flex-center b3-tooltips b3-tooltips__sw" aria-label="${window.siyuan.languages.refresh}"><svg><use xlink:href="#iconRefresh"></use></svg></span>
        <span id="urlButton" class="block__icon block__icon--show fn__flex-center b3-tooltips b3-tooltips__sw" aria-label="${this.i18n.loadFromUrl}"><svg><use xlink:href="#iconLanguage"></use></svg></span>
        `)

            const urlButton = searchBar.querySelector('#urlButton');
            urlButton.addEventListener('click', async (e: MouseEvent) => {
                const result = await this.readUrlFromDialog(e);
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

    async readUrlFromDialog(e: MouseEvent): Promise<{ value: string }> {
        return new Promise((resolve) => {
            const d = new Dialog({
                transparent: true,
                content: `<div class="b3-dialog-content" style="padding: 12px"><input id="emojiUrl" type="text" class="b3-text-field" style="width: 300px; margin-right: 8px"><button class="b3-button" id="confirm">${this.i18n.confirm}</button></div>`,
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
            throw Error(this.i18n.notAnImage);
        }).then((blob) => {
            const type = blob.type;
            return new File([blob], (window.Lute as any).NewNodeID() + '.' + type.split('/')[1]);
        }).catch((e) => {
            showMessage(this.name + ':' + this.i18n.downloadFailed + ":\n" + e);
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
                showMessage(this.name + ':' + this.i18n.saveFailed);
                return false;
            }
            return true;
        }).catch((e) => {
            showMessage(this.name + ':' + this.i18n.saveFailed + ":\n" + e);
            return false;
        })
    }
}