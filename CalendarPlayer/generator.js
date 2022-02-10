var ffmpeg = require('fluent-ffmpeg')
var bmp = require("bmp-js")
var fs = require('fs')
var path = require('path')
var readline = require('readline')
var util = require('util')

const WIDTH = 14
const HEIGHT = 20
const SIZE = `${WIDTH}x${HEIGHT}`

const DEFAULT_FPS = 20
const DEFAULT_OUT_DIR = "./out"
const DEFAULT_JSON_FILE = "generated_code.json"

async function main(args) {
    const filePath = args[0]
    if (!filePath) {
        console.error("ERROR: You need to specify the input file.")
        process.exit(1)
    }

    const outDir = path.resolve(DEFAULT_OUT_DIR)

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    // make sure output folder exists
    if (!fs.existsSync(DEFAULT_OUT_DIR)) {
        fs.mkdirSync(DEFAULT_OUT_DIR)
    } else {
        // verify that folder is empty
        const files = fs.readdirSync(outDir)
        if (files.length > 0) {
            const question = util.promisify(rl.question).bind(rl)
            const answer = await question(`The specified directory contains ${files.length} files. Do you want to delete them? (Y/n)`)
            if (!answer || answer.toLowerCase() === "y") {
                deleteAllFiles(outDir, files)
            }
        }
    }

    rl.close()

    ffmpeg(filePath)
        .noAudio()
        .fps(DEFAULT_FPS)
        .size(SIZE)
        //.keepDAR()
        //.autoPad(true, "black")
        .addOutputOption("-sws_flags neighbor")
        .on('start', function (commandLine) {
            console.log('Spawned ffmpeg with command: ' + commandLine)
            console.log(`Generating bitmap files in directory: ${outDir}`)
        })
        .on('error', function (err) {
            console.log('An error occurred: ' + err.message)
        })
        .on('progress', function (progress) {
            console.log('Processing: ' + progress.percent + '% done')
        })
        .on('end', function () {
            console.log('Processing finished !')
            console.log("Processing bitmap files...")
            processBitmaps(outDir)
        })
        .save(`${outDir}/%03d.bmp`)
}

function processBitmaps(directory) {
    const frames = []

    let actualWidth
    let actualHeight

    const files = fs.readdirSync(directory)
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const bmpBuffer = fs.readFileSync(path.join(directory, file))
        const bmpData = bmp.decode(bmpBuffer)

        actualWidth = bmpData.width
        actualHeight = bmpData.height

        const frame = generateFrame(bmpData.data)
        frames.push(Array.from(frame))

        //console.log(`${i + 1}/${files.length} processed...`)
    }

    if (!actualWidth || !actualHeight) {
        throw new Error("Failed to get actual width and height of bitmaps.")
    }

    // generate code snippet
    const obj = {
        width: actualWidth,
        height: actualHeight,
        fps: DEFAULT_FPS,
        frames: frames
    }

    const json = JSON.stringify(obj)

    console.log("Writing generated json code to", DEFAULT_JSON_FILE)
    fs.writeFileSync(DEFAULT_JSON_FILE, json)

    // construct output buffer

    // HEADER
    // Byte | Value
    // ---- | -----
    // 0    | width, high byte
    // 1    | width, low byte
    // 2    | height, high byte
    // 3    | height, low byte
    // 4-n  | payload, see below
    //
    // PAYLOAD
    // Byte | Value
    // ---- | -----
    // i+0  | pixel #i RED
    // i+1  | pixel #i GREEN
    // i+2  | pixel #i BLUE
    // ...  | repeat for all pixels of a frame, next frames are appended

    //              -[ Header ]-              -[ Payload ]-
    // const bufferSize = 2 * 2 + 3 * actualWidth * actualHeight * frames.length
    // const buffer = Buffer.alloc(bufferSize)
}

/**
 * Generates a frame that can be rendered by the userscript from the bitmap byte buffer.
 * @param {Buffer} data
 */
function generateFrame(data) {
    const pixels = data.length / 4
    const colors = new Uint8Array(pixels * 3)

    let index = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
        colors[index++] = data.readUInt8(offset + 3) // red
        colors[index++] = data.readUInt8(offset + 2) // green
        colors[index++] = data.readUInt8(offset + 1) // blue
    }

    return colors
}

function deleteAllFiles(dir, files) {
    files.forEach(file => {
        fs.unlinkSync(path.join(dir, file))
    })
}

main(process.argv.slice(2))
