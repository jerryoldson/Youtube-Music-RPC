const { ipcRenderer } = require("electron");

class SongDataObserver {
  constructor() {
    this.songData = {
      Title: null,
      Album: null,
      Autor: null,
      Image: null,
      Start: null,
      End: null,
      AlbumURL: null,
      AutorURL: null,
    };
    document.addEventListener("DOMContentLoaded", () => {
      this.init();
    });
  }

  init() {
    this.waitForElements()
      .then(() => {
        this.observeTitleAndInfo();
        this.videoListener();
      })
      .catch((err) => {
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
            reject(
              new Error(`Element ${selector} not found within ${timeout}ms`)
            );
          }
        };
        checkForElement();
      });
    };

    await Promise.all([
      querySelectorAsync(".title.style-scope.ytmusic-player-bar"),
      querySelectorAsync(".subtitle.style-scope.ytmusic-player-bar"),
      querySelectorAsync("#thumbnail img"),
      querySelectorAsync("video"),
    ]);
  }

  observeTitleAndInfo() {
    const playerBar = document.querySelector("ytmusic-player-bar");
    if (!playerBar) return;
    console.log("initialized");

    const observer = new MutationObserver(() => {
      const targetNodeTitle = document.getElementsByClassName(
        "title style-scope ytmusic-player-bar"
      )[0];
      const targetNodeInfo = document.getElementsByClassName(
        "subtitle style-scope ytmusic-player-bar"
      )[0];
      const targetNodeImage = document.querySelector("#thumbnail img");
      const sel = targetNodeInfo.querySelectorAll("yt-formatted-string a");
      const album = sel[sel.length - 1];

      if (
        targetNodeTitle &&
        targetNodeInfo &&
        targetNodeImage &&
        sel &&
        album
      ) {
        this.getData();
      }
    });

    observer.observe(playerBar, { childList: true, subtree: true });
  }

  getData() {
    try {
      const targetNodeTitle = document.getElementsByClassName(
        "title style-scope ytmusic-player-bar"
      )[0];
      const targetNodeInfo = document.getElementsByClassName(
        "subtitle style-scope ytmusic-player-bar"
      )[0];
      const targetNodeImage = document.querySelector("#thumbnail img");
      const sel = targetNodeInfo.querySelectorAll("yt-formatted-string a");
      const album = sel[sel.length - 1];

      const actualTitle = targetNodeTitle.textContent;
      const actualAutor = Array.from(sel)
        .slice(0, -1)
        .map((e) => e.textContent)
        .join(", ");
      const actualAlbum = album ? album.textContent : null;
      const actualImage = targetNodeImage.src.startsWith("data:image")
        ? document.querySelector(".image.style-scope.ytmusic-player-bar")?.src
        : targetNodeImage.src;
      const videoEl = document.querySelector("video");
      const currentTime = videoEl?.currentTime || 0;
      const songLength = videoEl?.duration;
      const actualStart = Date.now() - Math.round(currentTime * 1000);
      const actualEnd =
        Date.now() + Math.round((songLength - currentTime) * 1000);
      const actualAlbumURL = album?.href || "";
      const actualAutorURL = sel[0].href;

      this.updateData({
        actualTitle,
        actualAutor,
        actualAlbum,
        actualImage,
        actualStart,
        actualEnd,
        actualAlbumURL,
        actualAutorURL,
      });
    } catch (error) {}
  }

  videoListener() {
    const video = document.querySelector("video");

    video.addEventListener("pause", () => {
      ipcRenderer.postMessage("dsrpc", { type: "CLEAR_ACTIVITY", text: null });
    });
  }

  updateData(value) {
    const video = document.querySelector("video");
    const shouldUpdate =
      this.songData.Title !== value.actualTitle ||
      this.songData.Album !== value.actualAlbum ||
      this.songData.Autor !== value.actualAutor ||
      this.songData.Image !== value.actualImage ||
      this.songData.Start !== value.actualStart ||
      this.songData.End !== value.actualEnd ||
      this.songData.AlbumURL !== value.actualAlbumURL ||
      this.songData.AutorURL !== value.actualAutorURL;

    if (shouldUpdate && !video.paused) {
      this.songData.Title = value.actualTitle;
      this.songData.Album = value.actualAlbum;
      this.songData.Autor = value.actualAutor;
      this.songData.Image = value.actualImage;
      this.songData.Start = value.actualStart;
      this.songData.End = value.actualEnd;
      this.songData.AlbumURL = value.actualAlbumURL;
      this.songData.AutorURL = value.actualAutorURL;

      this.setPresence();
    }
  }

  setPresence() {
    const cstatus = {
      name: this.songData.Title,
      type: 2 /*listening :p*/,
      details: this.songData.Title,
      state: this.songData.Autor || this.songData.Album,
      largeImageKey: this.songData.Image,
      largeImageText: this.songData.Album || null,
      startTimestamp: this.songData.Start,
      endTimestamp: this.songData.End,
      details_url: window.location.href,
      large_url: this.songData.AlbumURL,
      state_url: this.songData.AutorURL,
      instance: false,
    };
    console.log(cstatus);
    ipcRenderer.postMessage("dsrpc", { type: "SET_PRESENCE", text: cstatus });
  }
}

new SongDataObserver();
