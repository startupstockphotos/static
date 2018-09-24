const path = require('path')
const fs = require('fs-extra')
const jimp = require('jimp')
const log = require('log-update')
const getColors = require('get-image-colors')
const imageSize = require('image-size')

function write (img, id, name) {
  return img.writeAsync(path.join('/photos/processed', id, name))
}

function watermark (img) {
  return jimp.loadFont(jimp.FONT_SANS_32_WHITE)
    .then(font => {
      return img.print(font, 0, 0, {
        text: 'STARTUP STOCK',
        alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: jimp.VERTICAL_ALIGN_MIDDLE
      }, 1000)
    })
}

function gen (filepath) {
  const id = path.basename(filepath, '.jpg')

  return Promise.all([
    new Promise(res => {
      getColors(filepath)
        .then(colors => colors.map(c => c.hex()))
        .then(colors => {
          fs.outputFile(
            path.join('photos/processed', id, 'stats.json'),
            JSON.stringify({
              color: colors[0],
              size: (fs.statSync(filepath).size / 1000 / 1024),
              ...imageSize(filepath)
            }, null, '  '),
            'utf8'
          ).then(res)
        })
    }),
    // jimp.read(filepath)
    //   .then(img => img.resize(800, jimp.AUTO))
    //   .then(img => img.pixelate(20))
    //   .then(img => img.quality(30))
    //   .then(img => write(img, id, 'placeholder.jpg')),
    // jimp.read(filepath)
    //   .then(img => img.resize(2000, jimp.AUTO))
    //   .then(img => img.quality(50))
    //   // .then(watermark)
    //   .then(img => write(img, id, 'display.jpg'))
  ])
}

/**
 * Process
 */
const { _: args } = require('minimist')(process.argv.slice(2))

fs.ensureDir('photos/processed')

if (args[0] === 'all') {
  let count = 0

  fs.readdir('photos/raw', (err, files) => {
    files = files
      .filter(f => !/DS_Store/.test(f))
      .map(f => path.join('photos/raw', f))

    const length = files.length

    log(`processing ${length} files`)

    ;(function process (file) {
      gen(file).then(() => {
        log(`processed ${file} - ${++count} of ${length} files`)

        if (files.length) {
          process(files.pop())
        } else {
          log('processing complete')
        }
      })
    })(files.pop())
  })
} else if (/\.jpg/.test(args[0])) {
  log(`processing ${args[0]}`)

  gen(path.resolve(args[0])).then(() => {
    log('processing complete')
  })
}
