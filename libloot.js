const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const Zip = require('node-7z');
const fetch = require('cross-fetch');
const tar = require('tar');

const LIBLOOT_VERSION = '0.18.3';
const TEMP_PATH = process.platform === "win32" ? 'libloot.7z' : 'libloot.tar.xz';
const INST_PATH = path.join(__dirname, 'libloot');
const PACK_PATH = process.platform === 'win32' ? 'unpacked_libloot' : INST_PATH;

function download (cb){
    fetch(`https://github.com/loot/libloot/releases/download/${
        LIBLOOT_VERSION
    }/libloot-${
        LIBLOOT_VERSION
    }-${
        process.platform === 'win32' ? 'win64.7z' : 'Linux.tar.xz'
    }`)
    .then((res) => {
        console.log(res.status, res.statusText);
        res.arrayBuffer()
            .then((buffer) => {
                fs.writeFile(TEMP_PATH, Buffer.from(buffer), (err) => {
                    if (err){ throw err; }
                    cb();
                });
            })
    })
    .catch((err) => {
        throw new Error(`download failed ${err}`);
    });
}

function unpack (){
    console.log('unpack', INST_PATH);
    new Zip().extractFull(
        TEMP_PATH,
        PACK_PATH,
        undefined,
        () => undefined,
        () => undefined
    )
    .then(
        (result) => {
            if (result.errors.length > 0){
                console.log('Decompression failed! Errors: %s', ...result.errors);
                throw result.errors;
            }
            console.log('Decompression done!');
            if (process.platform === 'win32'){
                // 7zip cannot extract only a subdirectory.
                // Instead, the following lines move the required
                // subdirectory to the expected library location.
                fs.renameSync(path.join(PACK_PATH, `libloot-${LIBLOOT_VERSION}-win64`), INST_PATH);
                // Nexus-Mods/node-7z's Zip.list appears broken so
                // it won't be confirmed if all contents from the archive
                // were moved. Instead, cleanup the holding directory completely.
                fs.rm(PACK_PATH, { recursive: true, force: true }, (err) => {
                    if (err){
                        throw err;
                    } else {
                        console.log('Extaction done!');
                    }
                });
            } else {
                // Just as the archive extension suggests,
                // the compressed archive contains a tar.
                // This makes it easy to dump the archive in-place.
                tar.x({
                    C: INST_PATH,
                    strip: 1,
                    file: path.join(PACK_PATH, 'libloot.tar')
                }).then(() => { console.log('Extaction done!'); });
            }
        },
        (err) => { throw err; }
    )
    .catch((err) => {
        fs.rm(INST_PATH, { recursive: true, force: true });
        if (PACK_PATH !== INST_PATH){
            fs.rm(PACK_PATH, { recursive: true, force: true });
        }
        throw new Error(`unpack failed ${err}`);
    });
}

try {
    fs.statSync(INST_PATH);
    console.log('libloot already installed');
} catch (err){
    download(unpack);
}
