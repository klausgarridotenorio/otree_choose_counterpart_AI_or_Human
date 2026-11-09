////////////////////////////////////////////////////////////////////////////////
// Initialization
////////////////////////////////////////////////////////////////////////////////
const myPrice = document.getElementById('myPrice');
const myQuality = document.getElementById('myQuality');
const myQualityOut = document.getElementById('myQualityOut');
const myProposal = document.getElementById('my-proposal');
const otherProposal = document.getElementById('other-proposal');

const btnChat = document.getElementById("btn-chat");
const btnOffer = document.getElementById("btn-offer");
const btnAccept = document.getElementById('btn-accept');

document.addEventListener('DOMContentLoaded', () => {
  if (js_vars.bot_opponent === true) {
    // Disable send buttons for bot opponent
    btnChat.disabled = true;
    myPrice.disabled = true;
    myQuality.disabled = true;

    // Start the negotiations, needed here for event loop
    setTimeout(() => {
      liveSend({'type': 'initial'});
    }, 1000);
  }
  receiveMessage(js_vars.messages);
  receiveoffers(js_vars.offers);

  // Always disable offer button on (re)loading of page
  btnOffer.disabled = true;
  if (!otherProposal.innerHTML.includes('none')) {
    btnAccept.style.display = 'block';
  }

  // Set the timer color to red if 30 seconds left
  $('.otree-timer__time-left').on('update.countdown', function (event) {
    if (event.offset.totalSeconds <= 30) {
      document.getElementsByClassName('time-left')[0].style.color = "#FF0000";
    }
  });

  setInterval(() => {
    liveSend({'type': 'ping'});
  }, 1000);
});

function liveRecv(data) {
  if ('finished' in data) {
    document.getElementById('form').submit();
  }
  if ('chat' in data) {
    receiveMessage(data.chat);
  }
  if ('offers' in data) {
    receiveoffers(data.offers);
  }
  if ('unblock' in data) {
    console.log("UNBLOCK received!");
    blockUnblock(false);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Blocking functionality
////////////////////////////////////////////////////////////////////////////////
let blockedChat = js_vars.bot_opponent;
let blockedOffer = js_vars.bot_opponent;
let blockCount = 0;

function blockUnblock(block) {
  if (js_vars.bot_opponent !== true) {
    return;
  }

  blockedChat = btnChat.disabled = block;

  blockedOffer = block || (blockCount < 2);
  if (blockedOffer === true) {
    btnOffer.disabled = true;
    myPrice.disabled = true;
    myQuality.disabled = true;
  } else {
    myPrice.disabled = false;
    myQuality.disabled = false;
    // Price has been entered, slider has been moved
    if (myPrice.value !== "" && myQualityOut.innerHTML !== "") {
      btnOffer.disabled = false;
    }
  }
  myPrice.placeholder="Price here..."
}

function unblockAfterMessage() {
  if (js_vars.bot_opponent !== true) {
    return;
  }
  let nicks = chatOutput.getElementsByClassName('otree-chat__nickname');

  blockCount = 0;
  Array.from(nicks).forEach((n) => {
    blockCount += n.innerHTML.includes("(Me)");
  });

  let lastNick = nicks[nicks.length - 1].innerHTML;
  if (!lastNick.includes("(Me)")) {
    blockUnblock(false);
  }
}

////////////////////////////////////////////////////////////////////////////////
// Bargain functionality
////////////////////////////////////////////////////////////////////////////////
myPrice.addEventListener("keydown", function (event) {
  // Only allow numbers and Delete/Backspace
  let key = event.key;
  if (isNaN(parseInt(key)) && !(key === 'Delete' || key === 'Backspace')) {
    event.preventDefault();
    return;
  }

  // Slider has been moved
  if (myQualityOut.innerHTML !== "" && blockedOffer === false) {
    btnOffer.disabled = false;
  }
});

myQuality.addEventListener("mouseup", function () {
  // Price has been entered
  if (myPrice.value !== "" && blockedOffer === false) {
    btnOffer.disabled = false;
  }
  myQualityOut.innerHTML = myQuality.value;
})

function sendOffer() {
  let price = parseInt(myPrice.value);
  let quality = parseInt(myQuality.value);
  if (!isNaN(price)) {
    liveSend({'type': 'propose', 'price': price, 'quality': quality})
  }
  myPrice.value = "";
  myQuality.value = 2;
  myQualityOut.innerHTML = "";
  btnOffer.disabled = true;
  blockUnblock(true);
}

function sendAccept() {
  btnChat.disabled = true;
  btnOffer.disabled = true;
  btnAccept.disabled = true;

  let proposal = otherProposal.innerHTML;
  let price = parseInt(proposal.split('<br>')[0].replace('€', ''));
  if (isNaN(price)) {
    return;
  }
  let quality = parseInt(proposal.split('<br>')[1]);
  liveSend({'type': 'accept', 'price': price, 'quality': quality})
}

function receiveoffers(offers) {
  offers.forEach((offer) => {
    if (offer['price'] !== null && offer['quality'] !== null) {
      let innerHTML = `€ ${offer['price']}<br>${offer['quality']}`;
      if (offer['idx'] === js_vars.id_in_group) {
        myProposal.innerHTML = innerHTML;
      } else {
        otherProposal.innerHTML = innerHTML;
        btnAccept.style.display = 'block';
      }
    }
  });
}

////////////////////////////////////////////////////////////////////////////////
// Chat functionality
////////////////////////////////////////////////////////////////////////////////
const chatOutput = document.getElementById("chat-output");
const chatInput = document.getElementById("chat-input");

chatInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && blockedChat === false) {
    sendMessage();
  }
});

function sendMessage() {
  let body = chatInput.value;
  if (body === "") {
    return;
  }

  liveSend({'type': 'chat', 'body': body});

  chatInput.value = "";
  blockUnblock(true);
}

function receiveMessage(messages) {
  let messagesHTML = '';
  messages.forEach((message) => {
    let nick = escapeHtml(message['nick']);
    let body = escapeHtml(message['body']).replaceAll('\n', '<br>');
    messagesHTML += "<div class='otree-chat__msg'>" +
        "<span class='otree-chat__nickname'>" + nick + "</span>" +
        "<span class='otree-chat__body'>" + body + "</span>" +
        "</div>";
  });
  messagesHTML += "<div class='otree-chat__msg'>&nbsp;</div>";
  chatOutput.innerHTML = messagesHTML;
  chatOutput.scrollTo({
    top: chatOutput.scrollHeight,
    left: 0,
    behavior: "smooth",
  });
  if (messages.length > 0) {
    unblockAfterMessage();
  }
}

function escapeHtml(string) {
  let entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return entityMap[s];
  });
}
