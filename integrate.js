/*
 * Copyright 2015 Jiří Janoušek <janousek.jiri@gmail.com>
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

"use strict";

(function(Nuvola)
{

if (Nuvola.global === window)
{
    /* Fix for broken detection of window.webkitAudioContext */
    var origHasOwnProperty = window.hasOwnProperty;
    window.hasOwnProperty = function(key)
    {
        return origHasOwnProperty.call(window, key) && window[key] !== undefined;
    };
}

// Create media player component
var player = Nuvola.$object(Nuvola.MediaPlayer);

// Handy aliases
var PlaybackState = Nuvola.PlaybackState;
var PlayerAction = Nuvola.PlayerAction;

// Create new WebApp prototype
var WebApp = Nuvola.$WebApp();

// Initialization routines
WebApp._onInitWebWorker = function(emitter)
{
    Nuvola.WebApp._onInitWebWorker.call(this, emitter);


    var state = document.readyState;
    if (state === "interactive" || state === "complete")
        this._onPageReady();
    else
        document.addEventListener("DOMContentLoaded", this._onPageReady.bind(this));
}

// Page is ready for magic
WebApp._onPageReady = function()
{
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect("ActionActivated", this);
    document.querySelector(".centerblock-wrapper").setAttribute('style', 'width: 100%');
    var sidebar = document.querySelector(".sidebar__placeholder .sidebar");
    sidebar.parentNode.removeChild(sidebar);

    // Start update routine
    this.update();
}

// Extract data from the web page
WebApp.update = function()
{
    var track = {
        title: null,
        artist: null,
        album: null,
        artLocation: null
    }

    try
    {
        track.title = document.querySelector(".player-controls .track .track__title").innerText;
        track.artist = document.querySelector(".player-controls .track .track__artists").innerText;
        track.artLocation = document.querySelector(".player-controls .track .album-cover").src.replace(
            /\d+x\d+$/, "200x200");
    }
    catch (e)
    {
        //~ console.log(e);
    }

    player.setTrack(track);

    var buttons = this.getButtons();
    if (buttons.pause)
        var state = PlaybackState.PLAYING;
    else if (buttons.play)
        var state = PlaybackState.PAUSED;
    else
        var state = PlaybackState.UNKNOWN;
    player.setPlaybackState(state);

    player.setCanGoPrev(!!buttons.prev);
    player.setCanGoNext(!!buttons.next);
    player.setCanPlay(!!buttons.play);
    player.setCanPause(!!buttons.pause);

    // Schedule the next update
    setTimeout(this.update.bind(this), 500);
}


WebApp.getButtons = function()
{
    var notDisabled = function(selector)
    {
        var elm = document.querySelector(selector);
        return (elm && !elm.classList.contains("player-controls__btn_disabled")) ? elm : null;
    }

    var playPause = notDisabled(".player-controls__btn_play");
    return {
        prev: notDisabled(".player-controls__btn_prev"),
        play: playPause && playPause.classList.contains("player-controls__btn_pause") ? null : playPause,
        pause: playPause && playPause.classList.contains("player-controls__btn_pause") ? playPause : null,
        next: notDisabled(".player-controls__btn_next")
    }
}

// Handler of playback actions
WebApp._onActionActivated = function(emitter, name, param)
{
    var buttons = this.getButtons();
    switch (name)
    {
    case PlayerAction.TOGGLE_PLAY:
        if (buttons.play)
            Nuvola.clickOnElement(buttons.play);
        else if (buttons.pause)
            Nuvola.clickOnElement(buttons.pause);
        break;
    case PlayerAction.PLAY:
        if (buttons.play)
            Nuvola.clickOnElement(buttons.play);
        break;
    case PlayerAction.PAUSE:
    case PlayerAction.STOP:
        if (buttons.pause)
            Nuvola.clickOnElement(buttons.pause);
        break;
    case PlayerAction.PREV_SONG:
        if (buttons.prev)
            Nuvola.clickOnElement(buttons.prev);
        break;
    case PlayerAction.NEXT_SONG:
        if (buttons.next)
            Nuvola.clickOnElement(buttons.next);
        break;
    }
}

WebApp.start();

})(this);  // function(Nuvola)
