// ==UserScript==
// @name            YouTube Music Like Button Enhancer
// @name:ko         YouTube Music 좋아요 버튼 개선
// @name:ja         YouTube Music いいねボタン拡張
// @name:zh         YouTube Music 点赞按钮增强
// @name:es         Mejora del botón Me gusta de YouTube Music
// @name:fr         Amélioration du bouton J'aime de YouTube Music
// @name:de         YouTube Music Mag ich-Schaltfläche Erweiterung
// @namespace       http://tampermonkey.net/
// @version         0.2.0
// @description     Enhances YouTube Music with custom like buttons for each song in the queue, syncs with the main player, and provides real-time updates.
// @description:ko  YouTube Music의 재생 목록에 각 곡마다 커스텀 좋아요 버튼을 추가하고, 메인 플레이어와 동기화하며 실시간 업데이트를 제공합니다.
// @description:ja  YouTube Musicのキュー内の各曲にカスタムいいねボタンを追加し、メインプレーヤーと同期して、リアルタイムの更新を提供します。
// @description:zh  为YouTube Music队列中的每首歌曲添加自定义点赞按钮，与主播放器同步，并提供实时更新。
// @description:es  Mejora YouTube Music con botones de Me gusta personalizados para cada canción en la cola, sincroniza con el reproductor principal y proporciona actualizaciones en tiempo real.
// @description:fr  Améliore YouTube Music avec des boutons J'aime personnalisés pour chaque chanson dans la file d'attente, synchronise avec le lecteur principal et fournit des mises à jour en temps réel.
// @description:de  Verbessert YouTube Music mit benutzerdefinierten Mag ich-Schaltflächen für jeden Song in der Warteschlange, synchronisiert mit dem Hauptplayer und bietet Echtzeit-Updates.
// @author          Daniel U
// @match           https://music.youtube.com/*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=music.youtube.com
// @grant           none
// @updateURL       https://gist.github.com/joonheeu/6517b8883ef8c6a5a764ec24be6c8232/raw/youtube-music-like-button.user.js
// @downloadURL     https://gist.github.com/joonheeu/6517b8883ef8c6a5a764ec24be6c8232/raw/youtube-music-like-button.user.js
// ==/UserScript==

;(function () {
  "use strict"

  const CONFIG = {
    ENABLE_LOGGING: true,
    DEBOUNCE_DELAY: 1000,
    TAILWIND_MODAL_DISMISSED_KEY: "tailwind_modal_dismissed",
    TAILWIND_INSTALL_URL:
      "https://gist.github.com/joonheeu/be3bccbed0a4bc0f6022fc51e01edf01/raw/add-tailwind-css.user.js",
    SELECTORS: {
      YT_MUSIC_APP: "ytmusic-app",
      DROPDOWN:
        "body > ytmusic-app > ytmusic-popup-container > tp-yt-iron-dropdown",
      QUEUE_ITEMS: [
        "div#primary-renderer > ytmusic-player-queue-item",
        "div#contents > ytmusic-player-queue-item",
        "div#automix-contents > ytmusic-player-queue-item",
      ],
      LIKE_STATUS_ITEMS: "#items > ytmusic-toggle-menu-service-item-renderer",
      RIGHT_CONTENT: "#right-content",
      SONG_TITLE: "yt-formatted-string.title.style-scope.ytmusic-player-bar",
      SONG_INFO: "div.song-info",
      PLAYER_BAR: "ytmusic-player-bar",
      LIKE_BUTTON: "#button-shape-like > button",
    },
    CLASSES: {
      LIKE_BUTTON: {
        BASE: "w-28 my-like-button ml-4 px-4 py-2 text-md font-extrabold rounded-lg shadow-md transition-all duration-300",
        ACTIVE: "bg-red-500 hover:bg-red-600 text-white",
        INACTIVE: "bg-zinc-800 hover:bg-zinc-900 text-white",
      },
      ADD_BUTTONS:
        "my-add-like-buttons-button w-full px-4 py-2 text-md font-extrabold rounded-lg text-white bg-zinc-800 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
      MY_LIKE_BUTTON: "my-like-button",
    },
    STYLES: {
      DEFAULT_BUTTON: `
        display: inline-block;
        padding: 4px 12px;
        margin-left: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: #f8f9fa;
        color: #212529;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        line-height: 1.5;
        text-align: center;
        text-decoration: none;
        vertical-align: middle;
        user-select: none;
      `,
      LIKE_BUTTON: `
        display: inline-block;
        padding: 4px 12px;
        margin-left: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: #dc3545;
        color: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        line-height: 1.5;
        text-align: center;
        text-decoration: none;
        vertical-align: middle;
        user-select: none;
      `,
      UNLIKE_BUTTON: `
        display: inline-block;
        padding: 4px 12px;
        margin-left: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: #f8f9fa;
        color: #212529;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        line-height: 1.5;
        text-align: center;
        text-decoration: none;
        vertical-align: middle;
        user-select: none;
      `,
    },
  }

  const TRANSLATIONS = {
    en: {
      LIKE: "Like",
      UNLIKE: "Unlike",
      ADD_UPDATE: "Update Like Buttons",
      PROCESSING: "Processing...",
      CANCELLING: "Cancelling...",
      RESETTING: "Resetting...",
      TAILWIND_MODAL_TITLE: "TailwindCSS is not functioning",
      TAILWIND_MODAL_MESSAGE:
        "To ensure the YouTube Music Like Button Enhancer works correctly, please install TailwindCSS.",
      TAILWIND_MODAL_INSTALL: "Install",
      TAILWIND_MODAL_DISMISS: "Dismiss",
    },
    ko: {
      LIKE: "좋아요",
      UNLIKE: "좋아요 취소",
      ADD_UPDATE: "좋아요 버튼 갱신",
      PROCESSING: "처리 중...",
      CANCELLING: "취소 중...",
      RESETTING: "초기화 중...",
      TAILWIND_MODAL_TITLE: "TailwindCSS가 정상적으로 작동하지 않습니다",
      TAILWIND_MODAL_MESSAGE:
        "YouTube Music 좋아요 버튼 개선 스크립트가 원활하게 작동하려면 TailwindCSS를 설치해 주세요.",
      TAILWIND_MODAL_INSTALL: "설치",
      TAILWIND_MODAL_DISMISS: "무시",
    },
    ja: {
      LIKE: "いいね",
      UNLIKE: "いいねを取り消す",
      ADD_UPDATE: "いいねボタンを更新",
      PROCESSING: "処理中...",
      CANCELLING: "キャンセル中...",
      RESETTING: "リセット中...",
      TAILWIND_MODAL_TITLE: "TailwindCSSが機能していません",
      TAILWIND_MODAL_MESSAGE:
        "YouTube Music Like Button Enhancerが正しく動作するために、TailwindCSSをインストールしてください。",
      TAILWIND_MODAL_INSTALL: "インストール",
      TAILWIND_MODAL_DISMISS: "無視",
    },
    zh: {
      LIKE: "喜欢",
      UNLIKE: "取消喜欢",
      ADD_UPDATE: "更新喜欢按钮",
      PROCESSING: "处理中...",
      CANCELLING: "正在取消...",
      RESETTING: "正在重置...",
      TAILWIND_MODAL_TITLE: "TailwindCSS未正常工作",
      TAILWIND_MODAL_MESSAGE:
        "为了确保YouTube Music喜欢按钮增强器正常工作，请安装TailwindCSS。",
      TAILWIND_MODAL_INSTALL: "安装",
      TAILWIND_MODAL_DISMISS: "忽略",
    },
    es: {
      LIKE: "Me gusta",
      UNLIKE: "No me gusta",
      ADD_UPDATE: "Actualizar botones de me gusta",
      PROCESSING: "Procesando...",
      CANCELLING: "Cancelando...",
      RESETTING: "Reiniciando...",
      TAILWIND_MODAL_TITLE: "TailwindCSS no está funcionando",
      TAILWIND_MODAL_MESSAGE:
        "Para asegurar que el mejorador de botones de me gusta de YouTube Music funcione correctamente, por favor instala TailwindCSS.",
      TAILWIND_MODAL_INSTALL: "Instalar",
      TAILWIND_MODAL_DISMISS: "Descartar",
    },
    fr: {
      LIKE: "J'aime",
      UNLIKE: "Je n'aime plus",
      ADD_UPDATE: "Mettre à jour les boutons J'aime",
      PROCESSING: "Traitement...",
      CANCELLING: "Annulation...",
      RESETTING: "Réinitialisation...",
      TAILWIND_MODAL_TITLE: "TailwindCSS ne fonctionne pas",
      TAILWIND_MODAL_MESSAGE:
        "Pour garantir que l'améliorateur de boutons J'aime de YouTube Music fonctionne correctement, veuillez installer TailwindCSS.",
      TAILWIND_MODAL_INSTALL: "Installer",
      TAILWIND_MODAL_DISMISS: "Ignorer",
    },
    de: {
      LIKE: "Gefällt mir",
      UNLIKE: "Gefällt mir nicht mehr",
      ADD_UPDATE: "Gefällt mir-Buttons aktualisieren",
      PROCESSING: "Wird verarbeitet...",
      CANCELLING: "Abbrechen...",
      RESETTING: "Zurücksetzen...",
      TAILWIND_MODAL_TITLE: "TailwindCSS funktioniert nicht",
      TAILWIND_MODAL_MESSAGE:
        "Um sicherzustellen, dass der YouTube Music Like Button Enhancer korrekt funktioniert, installieren Sie bitte TailwindCSS.",
      TAILWIND_MODAL_INSTALL: "Installieren",
      TAILWIND_MODAL_DISMISS: "Ignorieren",
    },
  }

  const Utils = {
    log: CONFIG.ENABLE_LOGGING ? console.log : () => {},
    warn: CONFIG.ENABLE_LOGGING ? console.warn : () => {},
    error: CONFIG.ENABLE_LOGGING ? console.error : () => {},

    detectLanguage: () => {
      const ytMusicLang = document.documentElement.lang || "en"
      return TRANSLATIONS[ytMusicLang] ? ytMusicLang : "en"
    },

    translate: (key) => {
      const lang = Utils.detectLanguage()
      return TRANSLATIONS[lang][key] || TRANSLATIONS["en"][key]
    },

    debounce: (func, delay) => {
      let timeoutId
      return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => func(...args), delay)
      }
    },

    waitForElement: (selector, callback, interval = 100) => {
      const element = document.querySelector(selector)
      if (element) {
        callback(element)
      } else {
        setTimeout(
          () => Utils.waitForElement(selector, callback, interval),
          interval
        )
      }
    },
  }

  const DOM = {
    getElement: (selector) => document.querySelector(selector),

    getAllElements: (selector) => document.querySelectorAll(selector),

    getDropdownElement: () => DOM.getElement(CONFIG.SELECTORS.DROPDOWN),

    getItems: () => {
      return CONFIG.SELECTORS.QUEUE_ITEMS.flatMap((selector) => [
        ...DOM.getAllElements(selector),
      ])
    },

    getLikeStatusElement: () => {
      const items = DOM.getAllElements(CONFIG.SELECTORS.LIKE_STATUS_ITEMS)
      for (const item of items) {
        const icon = item.querySelector("yt-icon.icon")
        if (icon) {
          const path = icon.querySelector("path")
          if (path) {
            const d = path.getAttribute("d")
            if (
              d.startsWith(
                "M18.77,11h-4.23l1.52-4.94C16.38,5.03,15.54,4,14.38,4c-0.58,0-1.14,0.24-1.52,0.65L7,11H3v10h4h1h9.43"
              )
            ) {
              return { element: item, isLiked: false }
            } else if (
              d.startsWith(
                "M3,11h3v10H3V11z M18.77,11h-4.23l1.52-4.94C16.38,5.03,15.54,4,14.38,4c-0.58,0-1.14,0.24-1.52,0.65L7,11v10h10.43"
              )
            ) {
              return { element: item, isLiked: true }
            }
          }
        }
      }
      return null
    },

    getYtMusicApp: () => DOM.getElement(CONFIG.SELECTORS.YT_MUSIC_APP),

    getSongInfoElement: (item) =>
      item.querySelector(CONFIG.SELECTORS.SONG_INFO),

    getRightContent: () => DOM.getElement(CONFIG.SELECTORS.RIGHT_CONTENT),

    getSongTitleElement: () => DOM.getElement(CONFIG.SELECTORS.SONG_TITLE),

    getPlayerBar: () => DOM.getElement(CONFIG.SELECTORS.PLAYER_BAR),

    getLikeButton: () => DOM.getElement(CONFIG.SELECTORS.LIKE_BUTTON),
  }

  const UI = {
    createButton: (text, onClick, className) => {
      const button = document.createElement("button")
      button.textContent = text
      button.addEventListener("click", onClick)

      if (isTailwindWorking) {
        button.className = className
      } else {
        button.style.cssText = className
      }

      return button
    },

    addOrUpdateLikeButton: (target, isActive) => {
      const songInfo = DOM.getSongInfoElement(target)
      if (!songInfo) return null

      let button = target.querySelector(`.${CONFIG.CLASSES.MY_LIKE_BUTTON}`)
      const updateButtonStyle = (btn, active) => {
        if (isTailwindWorking) {
          btn.className = `${CONFIG.CLASSES.LIKE_BUTTON.BASE} ${
            active
              ? CONFIG.CLASSES.LIKE_BUTTON.ACTIVE
              : CONFIG.CLASSES.LIKE_BUTTON.INACTIVE
          }`
        } else {
          btn.style.cssText = active
            ? CONFIG.STYLES.LIKE_BUTTON
            : CONFIG.STYLES.UNLIKE_BUTTON
        }
        btn.disabled = Interactions.isUpdating
      }

      if (!button) {
        button = UI.createButton(
          isActive ? Utils.translate("UNLIKE") : Utils.translate("LIKE"),
          async () => {
            if (!button.disabled) {
              Utils.log("Like button clicked")
              try {
                Interactions.hideContextMenu()
                await Interactions.toggleLike(target)
                const newIsActive = await Interactions.checkLikeStatus(target)
                button.textContent = newIsActive
                  ? Utils.translate("UNLIKE")
                  : Utils.translate("LIKE")
                updateButtonStyle(button, newIsActive)
              } catch (error) {
                Utils.error("Error toggling like:", error)
              } finally {
                DOM.getYtMusicApp().click()
                Interactions.showContextMenu()
              }
            }
          },
          isTailwindWorking
            ? `${CONFIG.CLASSES.LIKE_BUTTON.BASE} ${
                isActive
                  ? CONFIG.CLASSES.LIKE_BUTTON.ACTIVE
                  : CONFIG.CLASSES.LIKE_BUTTON.INACTIVE
              }`
            : isActive
            ? CONFIG.STYLES.LIKE_BUTTON
            : CONFIG.STYLES.UNLIKE_BUTTON
        )
        button.classList.add(CONFIG.CLASSES.MY_LIKE_BUTTON)
        target.appendChild(button)
      } else {
        button.textContent = isActive
          ? Utils.translate("UNLIKE")
          : Utils.translate("LIKE")
        updateButtonStyle(button, isActive)
      }
      return { button, songInfo }
    },

    createUpdateButton: () => {
      if (document.getElementById("update-button")) return

      const buttonContainer = document.createElement("div")
      buttonContainer.style.display = "flex"
      buttonContainer.style.alignItems = "center"

      const button = UI.createButton(
        Utils.translate("ADD_UPDATE"),
        Interactions.handleAddLikeButtons,
        isTailwindWorking
          ? CONFIG.CLASSES.ADD_BUTTONS
          : CONFIG.STYLES.DEFAULT_BUTTON
      )
      button.id = "update-button"

      buttonContainer.appendChild(button)

      const rightContent = DOM.getRightContent()
      if (rightContent) {
        rightContent.insertAdjacentElement("afterbegin", buttonContainer)
        Utils.log("Add/Update Like Buttons button created")
      } else {
        Utils.error("#right-content element not found")
      }
    },

    createTailwindInstallButton: () => {
      const button = document.createElement("button")
      button.textContent = `Install TailwindCSS Script`
      button.style.cssText = CONFIG.STYLES.DEFAULT_BUTTON
      button.addEventListener("click", () => {
        window.open(CONFIG.TAILWIND_INSTALL_URL, "_blank")
      })
      return button
    },

    showTailwindModal: () => {
      const modal = document.createElement("div")
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        text-align: center;
        max-width: 400px;
        width: 90%;
      `

      const title = document.createElement("h2")
      title.textContent = Utils.translate("TAILWIND_MODAL_TITLE")
      title.style.cssText = `
        margin-bottom: 20px;
        font-size: 24px;
        font-weight: bold;
      `

      const message = document.createElement("p")
      message.textContent = Utils.translate("TAILWIND_MODAL_MESSAGE")
      message.style.cssText = `
        margin-bottom: 30px;
        font-size: 18px;
        line-height: 1.5;
      `

      const buttonContainer = document.createElement("div")
      buttonContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 20px;
      `

      const buttonStyle = `
        padding: 10px 20px;
        font-size: 16px;
        font-weight: bold;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s;
        flex: 1;
        width: 150px;
      `

      const installLink = document.createElement("a")
      installLink.id = "install-tailwind"
      installLink.href = CONFIG.TAILWIND_INSTALL_URL
      installLink.target = "_blank"
      installLink.textContent = Utils.translate("TAILWIND_MODAL_INSTALL")
      installLink.style.cssText = `
        ${buttonStyle}
        background-color: #4CAF50;
        color: white;
        text-decoration: none;
      `

      const dismissButton = document.createElement("button")
      dismissButton.id = "dismiss-tailwind"
      dismissButton.textContent = Utils.translate("TAILWIND_MODAL_DISMISS")
      dismissButton.style.cssText = `
        ${buttonStyle}
        background-color: #f44336;
        color: white;
      `

      buttonContainer.appendChild(installLink)
      buttonContainer.appendChild(dismissButton)

      modal.appendChild(title)
      modal.appendChild(message)
      modal.appendChild(buttonContainer)

      document.body.appendChild(modal)

      installLink.addEventListener("click", (event) => {
        event.preventDefault()
        window.open(event.target.href, "_blank")
        document.body.removeChild(modal)
        App.init()
      })

      dismissButton.addEventListener("click", () => {
        const tailwindInstallButton = UI.createTailwindInstallButton()
        const updateButton = document.getElementById("update-button")
        updateButton.insertAdjacentElement("afterend", tailwindInstallButton)
        document.body.removeChild(modal)
        App.init()
      })
    },
  }

  const Interactions = {
    isUpdating: false,
    currentUpdateTask: null,

    openContextMenu: async (target) => {
      target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 60))
    },

    checkLikeStatus: async (target) => {
      Interactions.hideContextMenu()
      await Interactions.openContextMenu(target)
      const likeStatus = DOM.getLikeStatusElement()
      Interactions.showContextMenu()
      return likeStatus ? likeStatus.isLiked : false
    },

    toggleLike: async (target) => {
      await Interactions.openContextMenu(target)
      const likeStatusElement = DOM.getLikeStatusElement()
      if (likeStatusElement) likeStatusElement.element.click()
      else throw new Error("Like status element not found")
    },

    showContextMenu: () => {
      const dropdown = DOM.getDropdownElement()
      if (dropdown) dropdown.hidden = false
    },

    hideContextMenu: () => {
      const dropdown = DOM.getDropdownElement()
      if (dropdown) dropdown.hidden = true
    },

    addOrUpdateLikeButtonsToItems: async () => {
      if (Interactions.isUpdating) {
        Utils.log("Cancelling and resetting previous task")
        Interactions.cancelCurrentTask()
        return
      }

      Interactions.isUpdating = true
      Utils.log("Starting like button addition/update")

      try {
        await Interactions.disableAllButtons()
        const items = DOM.getItems()
        Utils.log(`Items to process: ${items.length}`)

        for (let index = 0; index < items.length; index++) {
          if (Interactions.currentUpdateTask?.cancelled) break
          await Interactions.processItem(items[index], index)
        }
      } catch (error) {
        Utils.error("Error in addOrUpdateLikeButtonsToItems:", error)
      } finally {
        await Interactions.finishUpdate()
      }
    },

    disableAllButtons: async () => {
      const updateButton = document.getElementById("update-button")
      const allLikeButtons = document.querySelectorAll(
        `.${CONFIG.CLASSES.MY_LIKE_BUTTON}`
      )

      if (updateButton) {
        updateButton.disabled = true
        updateButton.textContent = Utils.translate("PROCESSING")
      }
      allLikeButtons.forEach((button) => (button.disabled = true))
    },

    processItem: async (item, index) => {
      Utils.log(`Processing item ${index}`)
      try {
        const isActive = await Interactions.checkLikeStatus(item)
        Utils.log(
          `Item ${index} processed (like status: ${
            isActive ? "active" : "inactive"
          })`
        )
        UI.addOrUpdateLikeButton(item, isActive)
      } catch (error) {
        Utils.error(`Error processing item ${index}:`, error)
      }
    },

    handleAddLikeButtons: () => {
      const button = document.getElementById("update-button")
      if (Interactions.isUpdating) {
        button.textContent = Utils.translate("CANCELLING")
        Interactions.cancelCurrentTask()
        return
      } else {
        Interactions.addOrUpdateLikeButtonsToItems().catch((error) => {
          Utils.error("Error adding/updating like buttons:", error)
          Interactions.cancelCurrentTask()
        })
      }
    },

    cancelCurrentTask: () => {
      if (Interactions.currentUpdateTask) {
        Interactions.currentUpdateTask.cancel()
        Interactions.currentUpdateTask = null
      }
      Interactions.finishUpdate()
    },

    finishUpdate: () => {
      Interactions.isUpdating = false
      const updateButton = document.getElementById("update-button")
      const allLikeButtons = document.querySelectorAll(
        `.${CONFIG.CLASSES.MY_LIKE_BUTTON}`
      )

      if (updateButton) {
        updateButton.textContent = Utils.translate("ADD_UPDATE")
        updateButton.disabled = false
      }
      allLikeButtons.forEach((button) => (button.disabled = false))

      Utils.log("Like button addition/update completed")
    },

    extendLikeButtonFunctionality: () => {
      let isExtended = false

      const observeLikeButton = () => {
        if (isExtended) return

        const playerBar = DOM.getPlayerBar()
        if (!playerBar) {
          Utils.warn("Unable to find the player bar")
          return
        }

        const handleLikeButtonDetection = (playbarLikeButton) => {
          Utils.log("Like button detected on the player bar")

          const buttonObserver = new MutationObserver(async () => {
            Utils.log("Like button state change detected on the player bar")

            if (!Interactions.isUpdating) {
              await Interactions.updateSelectedItemLikeStatus()
            }
          })

          buttonObserver.observe(playbarLikeButton, {
            attributes: true,
            attributeFilter: ["aria-pressed"],
          })

          Utils.log("Like button functionality extended on the player bar")
          isExtended = true
        }

        const observer = new MutationObserver(() => {
          const playbarLikeButton = DOM.getLikeButton()
          if (playbarLikeButton && !isExtended) {
            observer.disconnect()
            handleLikeButtonDetection(playbarLikeButton)
          }
        })

        observer.observe(playerBar, {
          childList: true,
          subtree: true,
          attributes: true,
        })
      }

      observeLikeButton()

      const urlObserver = new MutationObserver(() => {
        const currentUrl = location.href
        if (currentUrl !== urlObserver.lastUrl) {
          urlObserver.lastUrl = currentUrl
          isExtended = false
          observeLikeButton()
        }
      })

      urlObserver.lastUrl = location.href
      urlObserver.observe(document.body, { childList: true, subtree: true })
    },

    updateSelectedItemLikeStatus: async () => {
      const items = DOM.getItems()
      const selectedItem = items.find((item) => item.hasAttribute("selected"))
      if (selectedItem) {
        try {
          const isActive = await Interactions.checkLikeStatus(selectedItem)
          Utils.log(
            `Selected item processed (like status: ${
              isActive ? "active" : "inactive"
            })`
          )
          UI.addOrUpdateLikeButton(selectedItem, isActive)
        } catch (error) {
          Utils.error("Error processing selected item:", error)
        }
      } else {
        Utils.warn("Selected item not found")
      }
    },
  }

  const App = {
    init: () => {
      App.checkAndCreateUpdateButton()
      App.observeUrlChanges()
      Interactions.extendLikeButtonFunctionality()
    },

    checkAndCreateUpdateButton: () => {
      Utils.waitForElement(
        CONFIG.SELECTORS.YT_MUSIC_APP,
        () => UI.createUpdateButton(),
        1000 * 5
      )
    },

    observeUrlChanges: () => {
      let lastUrl = location.href
      new MutationObserver(() => {
        const url = location.href
        if (url !== lastUrl) {
          lastUrl = url
          App.checkAndCreateUpdateButton()
        }
      }).observe(document, { subtree: true, childList: true })
    },

    observeSongChange: () => {
      const debouncedUpdate = Utils.debounce(() => {
        const button = document.getElementById("update-button")
        if (button && !button.disabled) {
          Interactions.handleAddLikeButtons()
        }
      }, CONFIG.DEBOUNCE_DELAY)

      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === "childList" ||
            mutation.type === "characterData"
          ) {
            Utils.log("Song change detected, scheduling like button update")
            debouncedUpdate()
            break
          }
        }
      }).observe(songTitleElement, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    },

    checkTailwindCSS: () => {
      const testElement = document.createElement("div")
      testElement.className = "hidden"
      document.body.appendChild(testElement)
      const computedStyle = window.getComputedStyle(testElement)
      isTailwindWorking = computedStyle.display === "none"
      document.body.removeChild(testElement)

      if (!isTailwindWorking) {
        UI.showTailwindModal()
      }

      return isTailwindWorking
    },
  }

  let isTailwindWorking = false

  function main() {
    // Check if TailwindCSS is working correctly
    App.checkTailwindCSS()

    // Wait for the YT Music app element to load, then add like buttons
    Utils.waitForElement(
      CONFIG.SELECTORS.YT_MUSIC_APP,
      () => UI.createUpdateButton(),
      1000 * 5
    )

    // Wait for the player bar element to load, then extend like button functionality
    Utils.waitForElement(
      CONFIG.SELECTORS.PLAYER_BAR,
      () => Interactions.extendLikeButtonFunctionality(),
      1000 * 5
    )

    // Wait for the song title element to load, then start observing song changes
    Utils.waitForElement(
      CONFIG.SELECTORS.SONG_TITLE,
      () => App.observeSongChange(),
      1000 * 60
    )
  }

  window.addEventListener("load", () => main())
})()
