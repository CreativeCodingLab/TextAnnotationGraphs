function load(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.send();

    return new Promise((res, err) => {
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    res(xhr.responseText);
                }
                else {
                    err(xhr);
                }
            }
        }
    });
}