class Fetcher { 
  //Initialize class with url
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

export { Fetcher };


