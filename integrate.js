/*
 * Copyright 2015-2017 Jiří Janoušek <janousek.jiri@gmail.com>
 * Copyright 2017 Aleksey Zhidkov <aleksey.zhidkov@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

(function (Nuvola) {
  if (Nuvola.global === window) {
    /* Fix for broken detection of window.webkitAudioContext */
    const origHasOwnProperty = window.hasOwnProperty
    window.hasOwnProperty = function (key) {
      return origHasOwnProperty.call(window, key) && window[key] !== undefined
    }
  }

  // Create media player component
  const player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  const PlaybackState = Nuvola.PlaybackState
  const PlayerAction = Nuvola.PlayerAction

  // Create new WebApp prototype
  const WebApp = Nuvola.$WebApp()

  // Translations
  const C_ = Nuvola.Translate.pgettext

  const ACTION_LIKE = 'like'

  // Initialization routines
  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    const state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }

    Nuvola.actions.addAction('like', 'win', ACTION_LIKE, C_('Action', 'Like'),
      null, null, null, true)
  }

  // Page is ready for magic
  WebApp._onPageReady = function () {
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect('ActionActivated', this)
    try {
      // Remove advertising sidebar
      document.querySelector('.centerblock-wrapper').setAttribute('style', 'width: 100%')
      const sidebar = document.querySelector('.sidebar__placeholder .sidebar')
      sidebar.parentNode.removeChild(sidebar)
    } catch (e) { /* ignored */ }

    player.addExtraActions([ACTION_LIKE])

    // Start update routine
    this.update()
  }

  WebApp._getShuffle = function () {
    const elm = this.getButtons().shuffle
    return elm ? elm.classList.contains('player-controls__btn_on') : null
  }

  WebApp._getRepeat = function () {
    const elm = this.getButtons().repeat
    if (!elm) {
      return null
    }

    if (elm.classList.contains('player-controls__btn_repeat_state1')) {
      return Nuvola.PlayerRepeat.PLAYLIST
    } else if (elm.classList.contains('player-controls__btn_repeat_state2')) {
      return Nuvola.PlayerRepeat.TRACK
    } else {
      return Nuvola.PlayerRepeat.NONE
    }
  }

  WebApp._setRepeat = function (repeat) {
    /*
     * There are mismatch between Nuvola's states order and Yandex.Music states order
     * and this map defines how much repeat button should be clicked, to change repeat state from current
     * to requested
     */
    /*eslint-disable */
    const clicksMap = {
      '00': 0,
      '01': 2,
      '02': 1,
      '10': 1,
      '11': 0,
      '12': 2,
      '20': 2,
      '21': 1,
      '22': 0
    }
    /*eslint-disable */
    const clicks = clicksMap[this._getRepeat() + '' + repeat]
    const repeatButton = this.getButtons().repeat
    for (let i = 0; i < clicks; i++) {
      Nuvola.clickOnElement(repeatButton)
    }
  }

  // Extract data from the web page
  WebApp.update = function () {
    const track = {
      title: null,
      artist: null,
      album: null,
      artLocation: null
    }

    try {
      track.title = document.querySelector('.player-controls .track .track__title').innerText
      track.artist = document.querySelector('.player-controls .track .track__artists').innerText
      track.artLocation = document.querySelector('.player-controls .track .track-cover').src.replace(
        /\d+x\d+$/, '200x200')
    } catch (e) {
      // ~ console.log(e);
    }

    player.setTrack(track)

    const buttons = this.getButtons()
    let state = null
    if (buttons.pause) {
      state = PlaybackState.PLAYING
    } else if (buttons.play) {
      state = PlaybackState.PAUSED
    } else {
      state = PlaybackState.UNKNOWN
    }
    player.setPlaybackState(state)

    player.setCanGoPrev(!!buttons.prev)
    player.setCanGoNext(!!buttons.next)
    player.setCanPlay(!!buttons.play)
    player.setCanPause(!!buttons.pause)
    player.setCanShuffle(!!buttons.shuffle)
    player.setCanRepeat(!!buttons.repeat)

    player.setShuffleState(this._getShuffle())
    player.setRepeatState(this._getRepeat())

    const actionsEnabled = {}
    const actionsStates = {}
    actionsEnabled[ACTION_LIKE] = buttons.like != null && document.querySelector('.head__userpic') != null
    actionsStates[ACTION_LIKE] = buttons.like != null && document.querySelector('.d-like_on') != null
    Nuvola.actions.updateEnabledFlags(actionsEnabled)
    Nuvola.actions.updateStates(actionsStates)

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  WebApp.getButtons = function () {
    const notDisabled = function (selector) {
      const elm = document.querySelector(selector)
      return (elm && !elm.classList.contains('player-controls__btn_disabled')) ? elm : null
    }
    const playPause = notDisabled('.player-controls__btn_play')
    return {
      prev: notDisabled('.player-controls__btn_prev'),
      play: playPause && playPause.classList.contains('player-controls__btn_pause') ? null : playPause,
      pause: playPause && playPause.classList.contains('player-controls__btn_pause') ? playPause : null,
      next: notDisabled('.player-controls__btn_next'),
      like: document.querySelector('.player-controls__btn.d-like_theme-player'),
      shuffle: document.querySelector('.player-controls__btn_shuffle'),
      repeat: document.querySelector('.player-controls__btn_repeat')
    }
  }

  // Handler of playback actions
  WebApp._onActionActivated = function (emitter, name, param) {
    const buttons = this.getButtons()
    switch (name) {
      case PlayerAction.TOGGLE_PLAY:
        if (buttons.play) {
          Nuvola.clickOnElement(buttons.play)
        } else if (buttons.pause) {
          Nuvola.clickOnElement(buttons.pause)
        }
        break
      case PlayerAction.PLAY:
        if (buttons.play) {
          Nuvola.clickOnElement(buttons.play)
        }
        break
      case PlayerAction.PAUSE:
      case PlayerAction.STOP:
        if (buttons.pause) {
          Nuvola.clickOnElement(buttons.pause)
        }
        break
      case PlayerAction.PREV_SONG:
        if (buttons.prev) {
          Nuvola.clickOnElement(buttons.prev)
        }
        break
      case PlayerAction.NEXT_SONG:
        if (buttons.next) {
          Nuvola.clickOnElement(buttons.next)
        }
        break
      case ACTION_LIKE:
        if (buttons.like) {
          Nuvola.clickOnElement(buttons.like)
        }
        break
      case PlayerAction.SHUFFLE:
        if (buttons.shuffle) {
          Nuvola.clickOnElement(buttons.shuffle)
        }
        break
      case PlayerAction.REPEAT:
        if (buttons.repeat) {
          this._setRepeat(param)
        }
        break
    }
  }

  WebApp.start()
})(this) // function(Nuvola)
