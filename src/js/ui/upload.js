/**
 * Allows the user to upload custom annotations for viewing
 */

const $ = require("jquery");
require("bootstrap/js/dist/modal");

// Templates
const tplUpload = require("../../templates/ui/upload.hbs");

class Uploader {
  showUploadModal() {
    const modalHtml = tplUpload();
    const $modal = $(modalHtml).appendTo("body").modal();
    $modal.find("#input-upload-file").on("change", (event) => {
      const filename = event.target.files[0].name;
      $modal.find("#label-upload-file").text(filename);
    });
    return $modal;
  }
}

module.exports = new Uploader();