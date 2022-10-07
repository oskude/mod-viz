# mod-viz

Some (proof-of-concept) [custom HTML elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components) to visualize [music tracker](https://en.wikipedia.org/wiki/Music_tracker) module files in real-time.

The "test" visuals [`note_grid.frag`](note_grid.frag) draws "note dots" on a grid where left to right is the channel, and bottom to top is the note number. Colors are assigned by the instrument number, spread over the "rainbow spectrum", volume is opacity. Oh, and the grid is "cropped" to the min/max note of the mod.

The hard-work is done by [libopenmpt](https://lib.openmpt.org/libopenmpt/) - much love!

## Dependencies

- [*nix?](https://en.wikipedia.org/wiki/Unix-like)
- git
- make
- emscripten

## Compile

```
$ make
```

Or, If we still need/want a workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1572644

```
$ make firefix
```

## Tinker

Cause some restrictions, we have to start/point a web server in this directory, for example:

```
$ python -m http.server 8888
Serving HTTP on 0.0.0.0 port 8888 (http://0.0.0.0:8888/) ...
```

Open the [`example.html`](example.html) in editor, and in browser through the web server.

For editing .xm mods, you should checkout https://github.com/8bitbubsy/ft2-clone

> PS. in some cases we need https, cause https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
