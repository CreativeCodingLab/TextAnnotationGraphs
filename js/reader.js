/** 
 *  reader.js
 *  -------------------
 *  parse a json file
 *
 */

 document.addEventListener('DOMContentLoaded',function() {
    
    const input = document.querySelector('input[type="file"]');
    input.onchange = function() {
        console.log(this.files[0])
    }

 })