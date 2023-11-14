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
  console.log(data)
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

    if (subscription) {
      const action = this.getURLParams('action'); 
      if(action){
          if (subscription.topics.includes(action) || subscription.topics.includes('*')) {
            this.fetchData().then(data => {
              if (typeof subscription.callback === "function") {
                  subscription.callback(data.parsedData);
              }
          }).catch(error => {
              console.error("There was an error fetching data:", error.message);
          });
      }
      }
     
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
      const response = await fetch(url);

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
      this.fetcher = new Fetcher();
      this.fetcher.initialize(fetcherOptions);
      this.subscriptions = subscriptions;
  }

  createChatbotIframe() {
      let element = document.getElementById('chatbot-container');
      if (!element) {
          element = document.createElement('div');
          element.id = 'mortyGPT-chatbot-container';
          element.style.cssText = `
            position: fixed; 
            right: 68px; 
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
          element.innerHTML = `<iframe id="${this.chatbotOptions.elementId}" src="${this.chatbotOptions.domain}" frameborder="0" style="width: 100%; height: 100%;"></iframe>`;
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
        right: 20px;
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
          chatbotContainer.style.display = chatbotContainer.style.display === 'none' || chatbotContainer.style.display === '' ? 'block' : 'none';
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
          callback: subscription.callback
      });
  }

  initializeSubscriptions() {
      this.subscriptions.forEach(subscription => this.handleSubscription(subscription));
  }

  init() {
      this.initChatbotLoader();
      this.initializeSubscriptions();
  }
}

export default UnifiedModule;
