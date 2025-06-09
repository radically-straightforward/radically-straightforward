# Radically Straightforward · FFmpeg

**🎞️ Install [FFmpeg](https://ffmpeg.org/) as an npm package**

## Installation

```console
$ npm install @radically-straightforward/ffmpeg
```

> **Note:** For quick-and-easy testing you may run FFmpeg from the command line with `npx` instead of installing it explicitly:
>
> ```console
> $ npx @radically-straightforward/ffmpeg
> ```

> **Note:** By default the latest version of FFmpeg is installed. You may specify a version in `package.json` with a `ffmpeg` property, for example:
>
> `package.json`
>
> ```json
> {
>   "ffmpeg": "7.1.1"
> }
> ```

## Usage

```console
$ npx ffmpeg
```

> **Note:** If the command above doesn’t work, which may happen in particular on Windows, use the path to the binary instead of `npx`:
>
> ```console
> > .\node_modules\.bin\ffmpeg
> ```

## Related Work

### [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static)

Only supports specific versions of FFmpeg and requires an update to the package itself when a new version of FFmpeg is released. At the time of this writing (2025-06-09) the latest supported version is FFmpeg 6.0 from 2023-02-28.

`@radically-straightforward/ffmpeg`, on the other hand, supports new versions of FFmpeg as soon as they’re released.

## Sources

- https://github.com/BtbN/FFmpeg-Builds/releases/tag/autobuild-2025-06-08-14-00
  - https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2025-06-08-14-00/ffmpeg-n7.1.1-22-g0f1fe3d153-linux64-gpl-7.1.tar.xz
  - https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2025-06-08-14-00/ffmpeg-n7.1.1-22-g0f1fe3d153-linuxarm64-gpl-7.1.tar.xz
  - https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2025-06-08-14-00/ffmpeg-n7.1.1-22-g0f1fe3d153-win64-gpl-7.1.zip
  - https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2025-06-08-14-00/ffmpeg-n7.1.1-22-g0f1fe3d153-winarm64-gpl-7.1.zip
- https://osxexperts.net/
  - https://www.osxexperts.net/ffmpeg71intel.zip
  - https://www.osxexperts.net/ffmpeg711arm.zip
