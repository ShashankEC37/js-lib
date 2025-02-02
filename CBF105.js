//JWT Functions
const base64url = (input) => {
  return btoa(input)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const encodeHeader = () => {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const jsonHeader = JSON.stringify(header);
  return base64url(jsonHeader);
};

const encodePayload = (data) => {
  const jsonPayload = JSON.stringify(data);
  return base64url(jsonPayload);
};

const signJWT = (data, secretKey) => {
  const header = encodeHeader();
  const payload = encodePayload(data);

  const signatureInput = `${header}.${payload}`;
  const signature = base64url(CryptoJS.HmacSHA256(signatureInput, secretKey));

  return `${header}.${payload}.${signature}`;
};

const dispatchInputEvents = (input, value) => {
  if (input) {
    console.log(input)
    console.log("Before substitution ",input.value)
    input.value = value;
    console.log("After substitution ",input.value)

    
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    
    console.log("Dispatched change events")
    
  }
};

//Load srcipt file
function loadScript(url, callback) {
  var script = document.createElement("script");
  script.src = url;
  document.head.appendChild(script);
  script.onload = callback;
 
}  

function waitForElementToLoad(callback, selectors,operations, timeOut) {
  if (operations.hasOwnProperty("click")) {
    var operation = setInterval(checkElementAndClick, timeOut);

    function checkElementAndClick() {
      const selector = operations["click"];
      const element = document.querySelector(selector);
  
      if (element) {
          console.log("Element is loaded. Waiting for 0.5 seconds before clicking on it.");
          setTimeout(function() {
              console.log("Clicking on the element now.");
              element.click();
              clearInterval(operation);
          }, 200); 
      }
  }
}
  console.log("In wait function", selectors);

  var obj = setInterval(function checkElements() {
    const allElementsLoaded = Object.keys(selectors).every((key) => {
      console.log(selectors[key])
      return document.querySelector(selectors[key]);
    });

    if (allElementsLoaded) {
      console.log("All elements are loaded");
      clearInterval(obj);
      callback();
    }
  }, timeOut);
}

function putDataInFields(fields, parsedData) {
  console.log("Fields-", fields);
  console.log("ParsedData-", parsedData);

  for (const fieldName in fields) {
    const selector = fields[fieldName];
    const value = parsedData[fieldName];
    console.log("Selector: ", selector, " Value: ", value);

    if (fieldName === 'intent') {
      // Handle the special case for the "intent" field
      const radioGroupSelector = '#enq-type';
      const radioButtons = document.querySelectorAll(`${radioGroupSelector} input`);
      
      radioButtons.forEach((radioButton) => {
        if (radioButton.value.toLowerCase() === value.toLowerCase()) {
          radioButton.click(); 
        }
      });
    } else {
      if (value) {
        console.log("Value identified", value);
        const element = document.querySelector(selector);
        if (element) {
          console.log("element identified", element);
          dispatchInputEvents(element, value);
        }
      }
    }
  }
}



class Fetcher {
  _subscriptions = []
  _baseUrl = "http://127.0.0.1:8000"
  _dataIdParam = "data_id"
  _ownerIdParam = "owner_id"
  _apiKey = ""


  initialize(config) {
    this._baseUrl = config.baseUrl;
    if (config.dataIdParam)
      this._dataIdParam = config.dataIdParam
    if (config.ownerIdParam)
      this._ownerIdParam = config.ownerIdParam
    if (config.apiKey)
      this._apiKey = config.apiKey

  }
   isNotEmpty(obj) {
    for (const prop in obj) {
      if (Object.hasOwn(obj, prop)) {
        return true;
      }
    }
  
    return false;
  }
  async validateApiKey(apiKey) {
    const response = await fetch(`${this._baseUrl}/authenticate`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "apiKey": apiKey })
  });

  if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  if (data.isValid === true) {
      return true;
  } else {
      return false;
  }
}
  subscribeAndListen(params) {
    if(!this.validateApiKey(this._apiKey)) {
      console.error("Wrong API key!");
      return null;
    }
    
    console.log("Nice API Key")
    const topics = params.topics;
    const callback = params.callback;
    
    const subscriptionId = crypto.randomUUID() 
    this._subscriptions.push({ id: subscriptionId, topics: topics, callback: callback });

    var subscription = { id: subscriptionId, topics: topics, callback: callback }
 
      
      const action = this.getURLParams('action');
      console.log("First if",action)

        
     
          if (action) {
            console.log("Inside if",action)
            this.fetchData().then(data => {
              if(this.isNotEmpty(data)){
                
                waitForElementToLoad(function() {
                  console.log(data.middleware.selector)
                  console.log(data.parsedData)

                  
                  //Calling the function to replace data to fields
                  putDataInFields(data.middleware.selector,data.parsedData);
                  if (typeof subscription.callback === "function") {
                      subscription.callback(data.parsedData);
                  }
              },data.middleware.selector,data.middleware.operations,params.timeOut);

              }
              
            
            
          }).catch(error => {
              console.error("There was an error fetching data:", error.message);
          });
      }
      
     
  
    return subscriptionId;
  }


  
  unsubscribeAll() {
    this._subscriptions = []
  }

  getURLParams(paramName) {
    return new URLSearchParams(window.location.search).get(paramName);
  }

 constructFetchUrl() {
    const data_id = this.getURLParams(this._dataIdParam);
    const owner_id = this.getURLParams(this._ownerIdParam);
    
    if (!data_id || !owner_id) {
      throw new Error("data_id or owner_id is missing in the URL.");
    }

    return `${this._baseUrl}/retrieve/${data_id}?ownerId=${owner_id}`;
  }

  async fetchData() {
    const url = this.constructFetchUrl();
  
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': this._apiKey
        }
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json();
      return data.data;
  
    } catch (error) {
      console.error("There was a problem with the fetch operation:", error.message);
      throw error;
    }
  }
  

}



class UnifiedModule {
  constructor(chatbotOptions, fetcherOptions, subscriptions) {
      this.chatbotOptions = chatbotOptions;
      this.fieldId = fetcherOptions.fieldId;
      this.timeOut = fetcherOptions.timeOut;
      this.fetcher = new Fetcher();
      this.fetcher.initialize(fetcherOptions);
      this.subscriptions = subscriptions;
  }

  createChatbotIframe() {
      let element = document.getElementById('chatbot-container');
      if (!element) {
          element = document.createElement('div');
          element.id = 'chatbot-container';
          element.style.cssText = `
            position: fixed; 
            right: 80px; 
            bottom: 68px; 
            width: ${this.chatbotOptions.defaultWidth}; 
            height: ${this.chatbotOptions.defaultHeight}; 
            border: none; 
            padding: 0;
            box-sizing: border-box;
            display: none; 
            z-index: 999;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
          `;
          const secretKey = "abc0372c1065e9651e4bb79511865942b6701f80509d04ce39ec28b8e4c80466"; 
          let data = {
            metaData: this.chatbotOptions.metaData,
            apiKey: this.chatbotOptions.apiKey
          }
          const jwtToken = signJWT(data, secretKey);
          let chatbotDomain = this.chatbotOptions.domain+"?token="+jwtToken
          console.log(chatbotDomain)
          element.innerHTML = `<iframe id="${this.chatbotOptions.elementId}" src="${chatbotDomain}" frameborder="0" style="width: 100%; height: 100%;"></iframe>`;
          document.body.appendChild(element);
      }
  }

  loadFontAwesome() {
      const link = document.createElement('link');
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
  }

  createChatbotButton() {
      const button = document.createElement('button');
      button.classList.add('chatbot-toggler');
      this.loadFontAwesome();

      const icon = document.createElement('i');
      icon.classList.add('fa-regular', 'fa-comment', 'fa-2xl');
      icon.style.cssText = 'color: #e2dd40; pointer-events: none;';

      button.appendChild(icon);

      button.style.cssText = `
        position: fixed;
        right: 60px;
        bottom: 20px;
        height: 60px;
        width: 60px;
        background-color: #724ae8;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        z-index: 1000;
      `;

      button.onclick = () => {
          const chatbotContainer = document.getElementById('chatbot-container');
          if(chatbotContainer){
            chatbotContainer.style.display = chatbotContainer.style.display === 'none' || chatbotContainer.style.display === '' ? 'block' : 'none';
          }
      };

      document.body.appendChild(button);
  }

  handleClickOutside(event) {
      const chatbotContainer = document.getElementById('chatbot-container');
      if (chatbotContainer && !chatbotContainer.contains(event.target) && !event.target.classList.contains('chatbot-toggler')) {
          chatbotContainer.style.display = 'none';
      }
  }

  initChatbotLoader() {
      this.createChatbotIframe();
      this.createChatbotButton();
      document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  handleSubscription(subscription) {
      return this.fetcher.subscribeAndListen({
          topics: subscription.topics,
          callback: subscription.callback,
          fieldId: this.fieldId,
          timeOut:this.timeOut,
       
          configData: subscription.configData
      });
  }

  initializeSubscriptions() {
      this.subscriptions.forEach(subscription => this.handleSubscription(subscription));
  }

  init() {
   
    loadScript("https://cdn.jsdelivr.net/npm/crypto-js@3.1.9-1/crypto-js.js", () => {
        this.initChatbotLoader();
        this.initializeSubscriptions();
  })
  }
}

