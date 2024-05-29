const { ipcRenderer } = require('electron');

class SongDataObserver {
  constructor() {
      this.songData = {
          Title: null,
          Album: null,
          Autor: null,
          Image: null,
      };
      document.addEventListener('DOMContentLoaded', () => {
          this.init();
      });
  }

  init() {
      console.log("initiated DSRPC");
      this.waitForElements().then(() => {
          this.observeTitleAndInfo();
          this.videoListener();
      }).catch(err => {
          console.error("Error initializing observers:", err);
      });
  }

  async waitForElements() {
      const querySelectorAsync = (selector, timeout = 10000) => {
          return new Promise((resolve, reject) => {
              const interval = 100;
              let elapsedTime = 0;
              const checkForElement = () => {
                  const element = document.querySelector(selector);
                  if (element) {
                      resolve(element);
                  } else if (elapsedTime < timeout) {
                      elapsedTime += interval;
                      setTimeout(checkForElement, interval);
                  } else {
                      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                  }
              };
              checkForElement();
          });
      };

      await Promise.all([
          querySelectorAsync('.title.style-scope.ytmusic-player-bar'),
          querySelectorAsync('.subtitle.style-scope.ytmusic-player-bar'),
          querySelectorAsync('#thumbnail img'),
          querySelectorAsync('video')
      ]);
  }

  observeTitleAndInfo() {
      const targetNodeTitle = document.getElementsByClassName('title style-scope ytmusic-player-bar')[0];
      const targetNodeInfo = document.getElementsByClassName('subtitle style-scope ytmusic-player-bar')[0];
      const targetNodeImage = document.querySelector('#thumbnail img');
      const observer = new MutationObserver((mutationsList) => {
          for (let mutation of mutationsList) {
              if (mutation.type === 'childList') {
                  const sel = targetNodeInfo.querySelectorAll('yt-formatted-string a');
                  const album = sel[sel.length - 1];

                  const actualTitle = targetNodeTitle.textContent;
                  const actualAutor = Array.from(sel).slice(0, -1).map((e) => e.textContent).join(", ");
                  const actualAlbum = album ? album.textContent : null;
                  const actualImage = targetNodeImage.src.startsWith("data:image") ? document.querySelector('.image.style-scope.ytmusic-player-bar')?.src : targetNodeImage.src;
                  console.log(actualTitle, "DSRPC");
                  console.log(actualAutor, "DSRPC");
                  console.log(actualAlbum, "DSRPC");
                  console.log(actualImage, "DSRPC");

                  this.updateData({
                      actualTitle,
                      actualAutor,
                      actualAlbum,
                      actualImage,
                  });
              }
          }
      });
      observer.observe(targetNodeTitle, { attributes: true, childList: true, subtree: true });
  }

  videoListener() {
      const video = document.querySelector('video');

      video.addEventListener('pause', () => {
          ipcRenderer.postMessage("dsrpc", { type: "CLEAR_ACTIVITY", text: null });
      });

      video.addEventListener('play', () => {
          this.setPresence();
      });
  }

  updateData(value) {
      if (this.songData.Title !== value.actualTitle || this.songData.Title !== '') {
          this.songData.Title = value.actualTitle;
          this.songData.Album = value.actualAlbum;
          this.songData.Autor = value.actualAutor;
          this.songData.Image = value.actualImage;
          this.setPresence();
      }
  }

  setPresence() {
      const cstatus = {
          name: this.songData.Title,
          type: 'LISTENING',
          details: this.songData.Title,
          state: this.songData.Autor || this.songData.Album,
          largeImageKey: this.songData.Image,
          largeImageText: this.songData.Album || null,
          instance: false
      }
      ipcRenderer.postMessage("dsrpc", { type: "SET_PRESENCE", text: cstatus });
  }
}

new SongDataObserver();
