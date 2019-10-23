/**
 * Generic background Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} data The event payload.
 * @param {object} context The event metadata.
 */
"use strict";

const gcs = require("@google-cloud/storage")();
const imagemagick = require("imagemagick-stream");
const size = ['300x300'];
const fs = require('fs');

exports.downscale = (data, context, callback) => {
    const file = data;
    console.log(`  Event ${context.eventId}`);
    console.log(`  Event Type: ${context.eventType}`);
    console.log(`  Bucket: ${file.bucket}`);
    console.log(`  File: ${file.name}`);
    console.log(`  Metageneration: ${file.metageneration}`);
    console.log(`  Created: ${file.timeCreated}`);
    console.log(`  Updated: ${file.updated}`);

    const bucket = gcs.bucket(file.bucket);
    const srcFilename = file.name;
    console.log(`Processing Original: gs://${file.bucket}/${srcFilename}`);

    Promise.all(size.map((size) => {

        const srcObject = bucket.file(srcFilename);
        let dstFilename = `${srcFilename}`;
        let dstObject = bucket.file(dstFilename);

        console.log(`Thumbnail ${size}: gs://${srcFilename.bucket}/${dstFilename}`);

        let srcStream = srcObject.createReadStream();
        let dstStream = dstObject.createWriteStream();

        let resize = imagemagick().resize(size).quality(90);

        console.log("Pipe");
        srcStream.pipe(resize).pipe(dstStream);

        return new Promise((resolve, reject) => {
            srcStream
                .on("error", (err) => {
                    console.log(`Error: ${err}`);
                    reject(err);
                })
                .on("finish", () => {
                    console.log(`Success: ${srcFilename} -> $ ${dstFilename}`);
                    resolve();
                });
        });

    })).then(function() {
        console.log("All successful");
        callback();
    }).catch(function (err) {
       console.log("At least one failure");
       callback(err);
    });
    fs.unlinkSync(`${file.name}`);
    fs.unlink(`${file.name}`, (err) => {
        if(err) {
            console.error(err);
        }
    });
    return null;
};