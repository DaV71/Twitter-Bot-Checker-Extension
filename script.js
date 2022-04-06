chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch(message) {
    case 'checker_true':
      enableChecker();
      break;
    case 'checker_false':
      disableChecker();
      break;
    case 'script_already_injected':
      sendResponse({status: 'yes'});
      break;
    case 'is_checker_enabled':
      sendResponse({status: enabled ? 'yes' : 'no'})
      break;
    default:
      break;
  }
  return true;
});

let enabled = false;
const observedElements = [];
const storedData = [];
const popupPrefix = 'userCheckData';
const rapidApiHeaders = {
	'content-type': 'application/json',
	'X-RapidAPI-Host': 'botometer-pro.p.rapidapi.com',
	'X-RapidAPI-Key': '<Paste key here>'
};
const twitterApiHeaders = {
  'Authorization': 'Bearer <Paste token here>'
};

const addListeners = (listeners) => {
  const elems = [...document.getElementsByClassName("css-901oao css-16my406 r-poiln3 r-bcqeeo r-qvutc0")];
  const newElements = elems.filter(e => e.textContent.startsWith('@') && !observedElements.includes(e) && e.tagName === 'SPAN');
  Object.entries(listeners).forEach(([eventType, callback]) => {
    newElements.forEach(e => e.addEventListener(eventType, callback, true))
  });
  observedElements.push(...newElements);
}

const removeListeners = (listeners) => {
  Object.entries(listeners).forEach(([eventType, callback]) => {
    observedElements.forEach(e => e.removeEventListener(eventType, callback, true));
  });
  observedElements.length = 0;
}

const getOffset = (el) => {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY
    };
}

const onScroll = () => {
  const listeners = {'mouseenter': onMouseEnter, 'mouseout': onMouseOut};
  addListeners(listeners);
}

const enableChecker = () => {
  console.log('checker enabled');
  enabled = true;
  const listeners = {'mouseenter': onMouseEnter, 'mouseout': onMouseOut};
  addListeners(listeners);
  window.onscroll = onScroll;
}

const disableChecker = () => {
  console.log('checker disabled');
  enabled = false;
  const listeners = {'mouseenter': onMouseEnter, 'mouseout': onMouseOut};
  removeListeners(listeners);
  window.onscroll = () => {};
}

const getFromStored = (userLogin) => {
  return storedData.find(e => e.login === userLogin);
}

const fetchData = (userLogin, event) => {
  return Promise.all([fetchTimeline(userLogin), fetchMentions(userLogin)])
    .then(([timeline, mentions]) => {
      if (timeline) {
        const options = {
          method: 'POST',
          headers: rapidApiHeaders,
          body: prepareBody(timeline, mentions, userLogin),
        }
        fetch('https://botometer-pro.p.rapidapi.com/4/check_account', options)
          .then(response => response.json())
          .then(response => {
            displayResult(userLogin, response, event);
            storedData.push({login: userLogin, data: response});
          })
          .catch(err => {throw err});
      } else {
        displayResult(null, null, event, true);
      }
    })
    .catch(err => {
      console.error(err);
      displayResult(null, null, event, true);
    });
}

const onMouseEnter = (event) => {
  const userLogin = event.target.textContent.substring(1);
  let userData;
  const stored = getFromStored(userLogin);
  if (stored) {
    userData = stored.data;
    displayResult(userLogin, userData, event);
  } else {
    fetchData(userLogin, event);
  }
}

const onMouseOut = (event) => {
  const userLogin = event.target.textContent.substring(1);
  setTimeout(() => {
    const popup = document.getElementById(`${popupPrefix}_${userLogin}`);
    if (popup) {
      popup.remove();
    }
  }, 500);
}

const displayResult = (userLogin, userData, event, error = false) => {
  console.log(userData);
  const elemDiv = document.createElement('div');
  elemDiv.id = `${popupPrefix}_${userLogin}`;
  const coords = getOffset(event.target);
  elemDiv.className = 'userCheckData';
  elemDiv.style.cssText = `left:${coords.left + 100}px;top:${coords.top - 50}px;`;
  elemDiv.innerText = 'Wynik sprawdzenia:';
  if (error) {
    const p = document.createElement('p');
    p.innerText = 'Nie udało się pobrać danych';
    elemDiv.appendChild(p);
  } else {
    const pLang = document.createElement('p');
    pLang.innerText = `Główny język: ${userData.user.majority_lang}`;
    const pEcho = document.createElement('p');
    pEcho.innerText = `Komora echa: ${userData.display_scores.universal.astroturf}`;
    const pFake = document.createElement('p');
    pFake.innerText = `Fałszywi obserwujący: ${userData.display_scores.universal.fake_follower}`;
    const pFinancial = document.createElement('p');
    pFinancial.innerText = `Finansowy: ${userData.display_scores.universal.financial}`;
    const pSelf = document.createElement('p');
    pSelf.innerText = `Samodeklarujący: ${userData.display_scores.universal.self_declared}`;
    const pSpammer = document.createElement('p');
    pSpammer.innerText = `Spamujący: ${userData.display_scores.universal.spammer}`;
    const pOther = document.createElement('p');
    pOther.innerText = `Inne: ${userData.display_scores.universal.other}`;
    const pOverall = document.createElement('p');
    pOverall.innerText = `Ogólny wskaźnik: ${userData.display_scores.universal.overall}`;
    elemDiv.appendChild(pLang);
    elemDiv.appendChild(pEcho);
    elemDiv.appendChild(pFake);
    elemDiv.appendChild(pFinancial);
    elemDiv.appendChild(pSelf);
    elemDiv.appendChild(pSpammer);
    elemDiv.appendChild(pOther);
    elemDiv.appendChild(pOverall);
    elemDiv.appendChild(getMark(userData.display_scores.universal.overall));
  }
  document.body.appendChild(elemDiv);
}

const getMark = (overall) => {
  const mark = document.createElement('img');
  if (overall < 1.66) {
    mark.src = 'https://cdn-icons-png.flaticon.com/512/1023/1023656.png';
    mark.className = 'happy mark';
  } else if (overall < 3.33) {
    mark.src = 'https://cdn-icons-png.flaticon.com/512/569/569524.png';
    mark.className = 'sceptic mark';
  } else {
    mark.src = 'https://cdn-icons-png.flaticon.com/512/42/42901.png';
    mark.className = 'sad mark';
  }
  mark.style.width = '64px';
  mark.style.height = '64px';
  return mark;
}

const success = res => res.ok ? res.json() : Promise.resolve({});

const prepareBody = (timeline, mentions, userLogin) => {
  const body = {
    "timeline": timeline,
    "mentions": mentions,
    "user": {
      "id_str": timeline[0]?.user?.id_str,
      "screen_name": userLogin,
    }
  }
  return JSON.stringify(body);
}

const fetchTimeline = (userLogin) => {
  const options = {
    method: 'GET',
    headers: twitterApiHeaders,
  };
  return fetch(`https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${userLogin}`, options)
    .then(success);  
}

const fetchMentions = (userLogin) => {
  const options = {
    method: 'GET',
    headers: twitterApiHeaders,
  };
  return fetch(`https://api.twitter.com/1.1/search/tweets.json?q=@${userLogin}`, options)
    .then(success);
}
