
// GLOBAL VARIABLES
const BASE_URL = "http://localhost:8000/api/";
const tabInfo = {};
let transcript;
let confidence;
let words;
let searchedWord = "";

const storedInfo = {};

chrome.storage.sync.get(['videoId', 'transcript', 'confidence', 'words'], function (results) {
  if (results.videoId) {
    storedInfo.videoId = results.videoId;
    storedInfo.transcript = results.transcript;
    storedInfo.confidence = results.confidence;
    storedInfo.words = results.words;
  };
});

// Obtains url and video ID


function getUrl() {
  const loading = document.getElementById("gif")

  chrome.tabs.query({ active: true }, function(tabs) {
    // Take tab ID and Url from tab object
    tabInfo.url = tabs[0].url;

    // Take query key value pairs from url
    const ytparams = tabInfo.url
      .split("?")[1]
      .split("&")
      .reduce((acc, val) => {
        let [key, value] = val.split("=");
        acc[key] = value;
        return acc;
      }, {});

    if (ytparams.v !== storedInfo.videoId) {
      
      // Create new request
      const req = new XMLHttpRequest();
      req.open("GET", `${BASE_URL}yturl/${ytparams.v}`, false);
      req.send();

      //removes the loading text and replaces it with the content
      document.body.removeChild(loading)
      document.getElementById("content").style.display = "contents";

      // Access response data
      const res = JSON.parse(req.response)
      transcript = res.transcript.toLowerCase();
      confidence = res.confidence;
      res.words.forEach(word => word.word = word.word.toLowerCase());
      words = res.words; 

      // Save response data to chrome storage
      chrome.storage.sync.set({videoId: ytparams.v}, function () {
        console.log('Saved videoId data.')
      });
      chrome.storage.sync.set({transcript}, function () {
        console.log('Saved transcript data.')
      });
      chrome.storage.sync.set({confidence}, function () {
        console.log('Saved confidence data.')
      });
      chrome.storage.sync.set({words}, function () {
        console.log('Saved words data.')
      });
    } else {
      //removes the loading text and replaces it with the content
      document.body.removeChild(loading)
      document.getElementById("content").style.display = "contents";

      transcript = storedInfo.transcript;
      confidence = storedInfo.confidence;
      words = storedInfo.words;
   };
 });
} 

// Removes generate script button on click
document.getElementById("genScriptButton").addEventListener("click", function() {
  document.getElementById("gif").style.display = "flex";
  getUrl();
  const body = document.getElementById("body");
  const genScriptButtonDiv = document.getElementById("genScriptButtonDiv");
  body.removeChild(genScriptButtonDiv);
});

document
  .getElementById("submitKeywordButton")
  .addEventListener("click", function() {
    const listCount = document.getElementById("listCount");
    const list = document.getElementById("list");

    if (list.childNodes.length > 0) {
      list.removeChild(list.lastElementChild);
    }

    // Defining keyword and instances of keyword
    const keyword = document.getElementById("keyword").value;
    searchedWord = keyword.toLowerCase();
    const keywordInstances = filterKeyword(keyword);
    filterSentences(keyword, keywordInstances);
    const fullScript = document.getElementById("fullScript");
    try {capitaliseKeywordInScript(fullScript)} catch (err) {}

    // Displays count of keyword
    if (keywordInstances.length === 0) {
      listCount.innerText = `I cannot find "${keyword}" in the video.`;
    } else {
      const listArea = document.getElementById("list");
      if (listArea.childNodes.length > 1) {
        listArea.removeChild(listArea.lastElementChild);
      }
      listCount.innerText = `I have found "${keyword}" ${
        keywordInstances.length
      } time(s)`;

      // Creates list of clickable keyword instances
      let newList = document.createElement("ol");
      newList.setAttribute("class", "orderedList")
      for (let i = 0; i < keywordInstances.length; i++) {
        let listItem = document.createElement("li");
        let youtubeLink = document.createElement("a");
        youtubeLink.addEventListener("click", function() {
          var myNewUrl = `${tabInfo.url.split('&t=')[0]}&t=${Math.max(keywordInstances[i].time - 3, 0)}`;
          chrome.tabs.update(undefined, { url: myNewUrl });
        });
        listItem.appendChild(youtubeLink);
        youtubeLink.appendChild(
          document.createTextNode(keywordInstances[i].displayData)
        );
        listItem.appendChild(
          document.createTextNode(` "${keywordInstances[i].sentence}"`)
        );
        newList.appendChild(listItem);
      }
      listArea.appendChild(newList);
    }
    document.getElementById("keyword").value = "";
  });

const filterKeyword = keyword => {
  // Find keyword instances
  const keywordInstances = words.filter(word => {
    return word.word.toLowerCase() === keyword.toLowerCase()
  });
  for (let i = 0; i < keywordInstances.length; i++) {
    // Find the hour, minute and second elements of the keyword instance time
    let hours = Math.floor(keywordInstances[i].time / 3600);
    let minutes = Math.floor((keywordInstances[i].time % 3600) / 60);
    minutes = `${minutes}`.length === 2 ? `${minutes}` : `0${minutes}`
    let seconds = keywordInstances[i].time % 60;
    seconds = `${seconds}`.length === 2 ? `${seconds}` : `0${seconds}`

    // Create the display for the keyword instance time
    keywordInstances[i].displayData = `${hours}:${minutes}:${seconds}`
  }
  return keywordInstances;
};

const filterSentences = (keyword, keywordInstances) => {
  // Split transcript into array
  const wordsArr = transcript.split(' ');
  let i = 0;
  // Create surrounding sentence for each keyword instance
  wordsArr.forEach((word, index) => {
    if (word === keyword) {
      let sentence = wordsArr.slice(Math.max(index - 2, 0), Math.min(index + 3, wordsArr.length));
      keywordInstances[i].sentence = `...${sentence.join(' ')}...`;
      i++;
    }
  })
}

const scriptButton = document.getElementById("scriptButton");
const scriptArea = document.getElementById("scriptArea");
scriptButton.addEventListener("click", function() {
  // Toggle button text
  scriptButton.innerText === "Show Script"
    ? (scriptButton.innerText = "Hide Script")
    : scriptButton.innerText === "Hide Script"
    ? (scriptButton.innerText = "Show Script")
    : null;

    // Display script depending on toggle
  if (scriptButton.innerText === "Hide Script") {
    let fullScript = document.createElement("p");
    fullScript.setAttribute("id", "fullScript");

    //Capitalises the keyword in the displayed transcript
    capitaliseKeywordInScript(fullScript);

    let copyButton = document.createElement("button");
    copyButton.innerText = "Copy Script";
    copyButton.setAttribute("class", "button")
    copyButton.addEventListener("click", function() {
      let tempScriptTag = document.createElement("input");
      document.body.appendChild(tempScriptTag);
      tempScriptTag.setAttribute("value", transcript);
      tempScriptTag.select();
      document.execCommand("copy");
      document.body.removeChild(tempScriptTag);
    });
    // Adding script and copy button
    scriptArea.appendChild(fullScript);
    scriptArea.appendChild(copyButton);
  } else {
    // Removing script and copy button
    while (scriptArea.childNodes.length > 0) {
      scriptArea.removeChild(scriptArea.lastElementChild);
    }
  }
});

const capitaliseKeywordInScript = (element) => {
      //Capitalises the keyword in the displayed transcript
      const displayScript = transcript.split(" ").map(word => {
        return (word === searchedWord) ? word.toUpperCase() : word
      }).join(' ');
      element.innerText = displayScript;
};