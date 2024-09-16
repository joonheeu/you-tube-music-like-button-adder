// ==UserScript==
// @name            YouTube Music Like Button Enhancer
// @name:ko         YouTube Music 좋아요 버튼 개선
// @name:ja         YouTube Music いいねボタン拡張
// @name:zh         YouTube Music 点赞按钮增强
// @name:es         Mejora del botón Me gusta de YouTube Music
// @name:fr         Amélioration du bouton J'aime de YouTube Music
// @name:de         YouTube Music Mag ich-Schaltfläche Erweiterung
// @namespace       http://tampermonkey.net/
// @version         2024-09-17
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

  const TRANSLATIONS = {
    en: {
      LIKE: "Like",
      UNLIKE: "Unlike",
      ADD_UPDATE: "Update Like Buttons",
      PROCESSING: "Processing...",
      CANCELLING: "Cancelling...",
      RESETTING: "Resetting...",
    },
    ko: {
      LIKE: "좋아요",
      UNLIKE: "좋아요 취소",
      ADD_UPDATE: "좋아요 버튼 갱신",
      PROCESSING: "처리 중...",
      CANCELLING: "취소 중...",
      RESETTING: "초기화 중...",
    },
    ja: {
      LIKE: "高評価",
      UNLIKE: "高評価を解除",
      ADD_UPDATE: "高評価ボタンを更新",
      PROCESSING: "処理中...",
      CANCELLING: "キャンセル中...",
      RESETTING: "リセット中...",
    },
    zh: {
      LIKE: "赞",
      UNLIKE: "取消赞",
      ADD_UPDATE: "更新赞按钮",
      PROCESSING: "处理中...",
      CANCELLING: "取消中...",
      RESETTING: "重置中...",
    },
    es: {
      LIKE: "Me gusta",
      UNLIKE: "Ya no me gusta",
      ADD_UPDATE: "Actualizar botones de Me gusta",
      PROCESSING: "Procesando...",
      CANCELLING: "Cancelando...",
      RESETTING: "Reiniciando...",
    },
    fr: {
      LIKE: "J'aime",
      UNLIKE: "Je n'aime plus",
      ADD_UPDATE: "Mettre à jour les boutons J'aime",
      PROCESSING: "Traitement en cours...",
      CANCELLING: "Annulation...",
      RESETTING: "Réinitialisation...",
    },
    de: {
      LIKE: "Mag ich",
      UNLIKE: "Gefällt mir nicht mehr",
      ADD_UPDATE: "Mag ich-Schaltflächen aktualisieren",
      PROCESSING: "Verarbeitung...",
      CANCELLING: "Abbrechen...",
      RESETTING: "Zurücksetzen...",
    },
  }

  const detectLanguage = () => {
    const ytMusicLang = document.documentElement.lang || "en"
    return TRANSLATIONS[ytMusicLang] ? ytMusicLang : "en"
  }

  const t = (key) => {
    const lang = detectLanguage()
    return TRANSLATIONS[lang][key] || TRANSLATIONS["en"][key]
  }

  const CONFIG = {
    ENABLE_LOGGING: true,
    BUTTON_TEXTS: {
      LIKE: () => t("LIKE"),
      UNLIKE: () => t("UNLIKE"),
      ADD_UPDATE: () => t("ADD_UPDATE"),
      PROCESSING: () => t("PROCESSING"),
      CANCELLING: () => t("CANCELLING"),
      RESETTING: () => t("RESETTING"),
    },
    CLASSES: {
      LIKE_BUTTON: {
        BASE: "w-28 my-like-button ml-4 px-4 py-2 text-md font-extrabold rounded-lg shadow-md transition-all duration-300",
        ACTIVE: "bg-red-500 hover:bg-red-600 text-white",
        INACTIVE: "bg-zinc-800 hover:bg-zinc-900 text-white",
      },
      ADD_BUTTONS:
        "my-add-like-buttons-button w-full px-4 py-2 text-md font-extrabold rounded-lg text-white bg-zinc-800 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
    },
    DEBOUNCE_DELAY: 1000,
  }

  const log = CONFIG.ENABLE_LOGGING ? console.log : () => {}

  const DOM = {
    getDropdownElement: () =>
      document.querySelector(
        "body > ytmusic-app > ytmusic-popup-container > tp-yt-iron-dropdown"
      ),
    getItems: () => [
      ...document.querySelectorAll(
        "div#primary-renderer > ytmusic-player-queue-item"
      ),
      ...document.querySelectorAll("div#contents > ytmusic-player-queue-item"),
      ...document.querySelectorAll(
        "div#automix-contents > ytmusic-player-queue-item"
      ),
    ],
    getLikeStatusElement: () => {
      const items = document.querySelectorAll(
        "#items > ytmusic-toggle-menu-service-item-renderer"
      )
      for (const item of items) {
        const icon = item.querySelector("yt-icon.icon")
        if (icon) {
          const path = icon.querySelector("path")
          if (path) {
            const d = path.getAttribute("d")
            console.log(d)
            if (
              d.startsWith(
                "M18.77,11h-4.23l1.52-4.94C16.38,5.03,15.54,4,14.38,4c-0.58,0-1.14,0.24-1.52,0.65L7,11H3v10h4h1h9.43"
              )
            ) {
              // Not liking it
              return { element: item, isLiked: false }
            } else if (
              d.startsWith(
                "M3,11h3v10H3V11z M18.77,11h-4.23l1.52-4.94C16.38,5.03,15.54,4,14.38,4c-0.58,0-1.14,0.24-1.52,0.65L7,11v10h10.43"
              )
            ) {
              // Liking it
              return { element: item, isLiked: true }
            }
          }
        }
      }
      return null
    },
    getYtMusicApp: () => document.querySelector("ytmusic-app"),
    getSongInfoElement: (item) => item.querySelector("div.song-info"),
    getRightContent: () => document.querySelector("#right-content"),
    getSongTitleElement: () =>
      document.querySelector(
        "yt-formatted-string.title.style-scope.ytmusic-player-bar"
      ),
  }

  const UI = {
    createButton: (text, onClick, className) => {
      const button = document.createElement("button")
      button.textContent = text
      button.addEventListener("click", onClick)
      button.className = className
      return button
    },

    addOrUpdateLikeButton: (target, isActive) => {
      const songInfo = DOM.getSongInfoElement(target)
      if (!songInfo) return null

      let button = target.querySelector(".my-like-button")
      const updateButtonStyle = (btn, active) => {
        btn.className = `${CONFIG.CLASSES.LIKE_BUTTON.BASE} ${
          active
            ? CONFIG.CLASSES.LIKE_BUTTON.ACTIVE
            : CONFIG.CLASSES.LIKE_BUTTON.INACTIVE
        }`
        btn.disabled = Interactions.isUpdating // Disable button during update
      }

      if (!button) {
        button = UI.createButton(
          isActive ? CONFIG.BUTTON_TEXTS.UNLIKE() : CONFIG.BUTTON_TEXTS.LIKE(),
          async () => {
            if (!button.disabled) {
              log("Like button clicked")
              try {
                Interactions.hideContextMenu()
                await Interactions.toggleLike(target)
                const newIsActive = await Interactions.checkLikeStatus(target)
                button.textContent = newIsActive
                  ? CONFIG.BUTTON_TEXTS.UNLIKE()
                  : CONFIG.BUTTON_TEXTS.LIKE()
                updateButtonStyle(button, newIsActive)
              } catch (error) {
                console.error("Error toggling like:", error)
              } finally {
                DOM.getYtMusicApp().click() // Close dropdown
                Interactions.showContextMenu()
              }
            }
          },
          `${CONFIG.CLASSES.LIKE_BUTTON.BASE} ${
            isActive
              ? CONFIG.CLASSES.LIKE_BUTTON.ACTIVE
              : CONFIG.CLASSES.LIKE_BUTTON.INACTIVE
          }`
        )
        button.classList.add("my-like-button")
        target.appendChild(button)
      } else {
        button.textContent = isActive
          ? CONFIG.BUTTON_TEXTS.UNLIKE()
          : CONFIG.BUTTON_TEXTS.LIKE()
        updateButtonStyle(button, isActive)
      }
      return { button, songInfo }
    },

    createAddLikeButtonsButton: () => {
      if (document.getElementById("addLikeButtonsButton")) return

      const button = UI.createButton(
        CONFIG.BUTTON_TEXTS.ADD_UPDATE(),
        Interactions.handleAddLikeButtons,
        CONFIG.CLASSES.ADD_BUTTONS
      )
      button.id = "addLikeButtonsButton"

      const rightContent = DOM.getRightContent()
      if (rightContent) {
        rightContent.insertAdjacentElement("afterbegin", button)
        log("Add/Update Like Buttons button created")
      } else {
        console.error("#right-content element not found")
      }
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
        log("Cancelling and resetting previous task")
        await Interactions.cancelCurrentTask()
      }

      Interactions.isUpdating = true
      log("Starting like button addition/update")

      try {
        await Interactions.disableAllButtons()
        const items = DOM.getItems()
        log(`Items to process: ${items.length}`)

        for (let index = 0; index < items.length; index++) {
          if (Interactions.currentUpdateTask?.cancelled) break
          await Interactions.processItem(items[index], index)
        }
      } catch (error) {
        console.error("Error in addOrUpdateLikeButtonsToItems:", error)
      } finally {
        await Interactions.finishUpdate()
      }
    },

    disableAllButtons: async () => {
      const addLikeButtonsButton = document.getElementById(
        "addLikeButtonsButton"
      )
      const allLikeButtons = document.querySelectorAll(".my-like-button")

      if (addLikeButtonsButton) {
        addLikeButtonsButton.disabled = true
        addLikeButtonsButton.textContent = CONFIG.BUTTON_TEXTS.PROCESSING()
      }
      allLikeButtons.forEach((button) => (button.disabled = true))
    },

    processItem: async (item, index) => {
      log(`Processing item ${index}`)
      try {
        const isActive = await Interactions.checkLikeStatus(item)
        log(
          `Item ${index} processed (like status: ${
            isActive ? "active" : "inactive"
          })`
        )
        UI.addOrUpdateLikeButton(item, isActive)
      } catch (error) {
        console.error(`Error processing item ${index}:`, error)
      }
    },

    handleAddLikeButtons: () => {
      const button = document.getElementById("addLikeButtonsButton")
      if (Interactions.isUpdating) {
        button.textContent = CONFIG.BUTTON_TEXTS.CANCELLING()
        Interactions.cancelCurrentTask()
      } else {
        Interactions.addOrUpdateLikeButtonsToItems().catch((error) => {
          console.error("Error adding/updating like buttons:", error)
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
      const addLikeButtonsButton = document.getElementById(
        "addLikeButtonsButton"
      )
      const allLikeButtons = document.querySelectorAll(".my-like-button")

      // Enable all buttons
      if (addLikeButtonsButton) {
        addLikeButtonsButton.textContent = CONFIG.BUTTON_TEXTS.ADD_UPDATE()
        addLikeButtonsButton.disabled = false
      }
      allLikeButtons.forEach((button) => (button.disabled = false))

      log("Like button addition/update completed")
    },

    debounce: (func, delay) => {
      let timeoutId
      return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => func(...args), delay)
      }
    },

    extendLikeButtonFunctionality: () => {
      let isExtended = false
      const observeLikeButton = () => {
        if (isExtended) return

        const playerBar = document.querySelector("ytmusic-player-bar")
        if (!playerBar) {
          console.warn("Player bar not found")
          return
        }

        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (
              mutation.type === "childList" ||
              mutation.type === "attributes"
            ) {
              const playbarLikeButton = document.querySelector(
                "#button-shape-like > button"
              )
              if (playbarLikeButton && !isExtended) {
                observer.disconnect()
                log("Player bar like button detected")

                // Store original onclick event
                const originalOnClick = playbarLikeButton.onclick

                // Extend onclick event
                playbarLikeButton.onclick = async function (event) {
                  // Execute original onclick
                  if (originalOnClick) {
                    originalOnClick.call(this, event)
                  }

                  // Execute custom functionality
                  log("Player bar like button clicked")
                  await updateSelectedItemLikeStatus()
                }

                // Watch for aria-pressed attribute changes
                const buttonObserver = new MutationObserver(async () => {
                  log("Player bar like button status change detected")
                  await updateSelectedItemLikeStatus()
                })

                buttonObserver.observe(playbarLikeButton, {
                  attributes: true,
                  attributeFilter: ["aria-pressed"],
                })

                log("Player bar like button functionality extended")
                isExtended = true
                return
              }
            }
          }
        })

        observer.observe(playerBar, {
          childList: true,
          subtree: true,
          attributes: true,
        })
      }

      const updateSelectedItemLikeStatus = async () => {
        const items = DOM.getItems()
        const selectedItem = items.find((item) => item.hasAttribute("selected"))
        if (selectedItem) {
          try {
            // Wait a bit to allow YouTube to update its status
            await new Promise((resolve) => setTimeout(resolve, 100))
            const isActive = await Interactions.checkLikeStatus(selectedItem)
            log(
              `Selected item processed (like status: ${
                isActive ? "active" : "inactive"
              })`
            )
            UI.addOrUpdateLikeButton(selectedItem, isActive)
          } catch (error) {
            console.error("Error processing selected item:", error)
          }
        } else {
          console.warn("Selected item not found")
        }
      }

      // Start observing immediately on page load
      observeLikeButton()

      // Restart observing on URL change
      let lastUrl = location.href
      const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href
          isExtended = false
          observeLikeButton()
        }
      })
      urlObserver.observe(document.body, { childList: true, subtree: true })
    },
  }

  const App = {
    init: () => {
      App.checkAndCreateButton()
      App.observeUrlChanges()
      Interactions.extendLikeButtonFunctionality()
    },

    checkAndCreateButton: () => {
      if (DOM.getYtMusicApp()) {
        UI.createAddLikeButtonsButton()
        App.observeSongChange()
      } else {
        setTimeout(App.checkAndCreateButton, 1000)
      }
    },

    observeUrlChanges: () => {
      let lastUrl = location.href
      new MutationObserver(() => {
        const url = location.href
        if (url !== lastUrl) {
          lastUrl = url
          App.checkAndCreateButton()
        }
      }).observe(document, { subtree: true, childList: true })
    },

    observeSongChange: () => {
      const songTitleElement = DOM.getSongTitleElement()
      if (songTitleElement) {
        log("Observing song title element")
        const debouncedUpdate = Interactions.debounce(() => {
          const button = document.getElementById("addLikeButtonsButton")
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
              log("Song change detected, scheduling like button update")
              debouncedUpdate()
              break
            }
          }
        }).observe(songTitleElement, {
          childList: true,
          characterData: true,
          subtree: true,
        })
      } else {
        console.warn("Song title element not found, retrying in 1 second")
        setTimeout(App.observeSongChange, 1000)
      }
    },
  }

  App.init()
})()
