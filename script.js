'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const weather_container = document.querySelector('.container');
const cross = document.querySelector('.close-modal');
const clear_all = document.querySelector('.clear');
//weather DOM
const iconElement = document.querySelector(".weather-icon");
const tempElement = document.querySelector(".temperature-value p");
const descElement = document.querySelector(".temperature-description p");
const locationElement = document.querySelector(".location p");
const notificationElement = document.querySelector(".notification");

const weather = {};

weather.temperature = {
    unit : "celsius"
}

// APP CONSTS AND VARS
const KELVIN = 273;
// API KEY
const key = "448107298cb996c16d19455cc9b6eb46";

function getWeather(latitude, longitude){
    let api = `http://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${key}`;
    
    fetch(api)
        .then(function(response){
            let data = response.json();
            return data;
        })
        .then(function(data){
            weather.temperature.value = Math.floor(data.main.temp - KELVIN);
            weather.description = data.weather[0].description;
            weather.iconId = data.weather[0].icon;
            weather.city = data.name;
            weather.country = data.sys.country;
        })
        .then(function(){
            displayWeather();
        });
}

// DISPLAY WEATHER TO UI
function displayWeather(){
    iconElement.innerHTML = `<img src="icons/${weather.iconId}.png"/>`;
    tempElement.innerHTML = `${weather.temperature.value}°<span>C</span>`;
    descElement.innerHTML = weather.description;
    locationElement.innerHTML = `${weather.city}, ${weather.country}`;
}

// C to F conversion
function celsiusToFahrenheit(temperature){
    return (temperature * 9/5) + 32;
}

// WHEN THE USER CLICKS ON THE TEMPERATURE ELEMENET
tempElement.addEventListener("click", function(){
    if(weather.temperature.value === undefined) return;
    
    if(weather.temperature.unit == "celsius"){
        let fahrenheit = celsiusToFahrenheit(weather.temperature.value);
        fahrenheit = Math.floor(fahrenheit);
        
        tempElement.innerHTML = `${fahrenheit}°<span>F</span>`;
        weather.temperature.unit = "fahrenheit";
    }else{
        tempElement.innerHTML = `${weather.temperature.value}°<span>C</span>`;
        weather.temperature.unit = "celsius"
    }
});

class Workout{
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration)
    {
        //this.date = ...
        this.coords=coords;
        this.distance=distance;
        this.duration=duration;
        
    }

    _setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.descroption = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout{
    type = 'running';
    constructor(coords, distance,duration,cadence){
        super(coords,distance,duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        this.pace = this.duration/this.distance;
        return this.pace;
    }
}

class Cycling extends Workout{
    type = 'cycling';
    constructor(coords, distance,duration,elevationGain){
        super(coords,distance,duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed(){
        this.speed = this.duration/(this.distance / 60);
        return this.speed;
    }
}



//Application Architecture
class App{
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 13
    constructor(){
        //get user position
        this._getPosition();
        //Get data from local storage
        this._getLocalStorage();
        // attach event handlers
        form.addEventListener('submit' , this._newWorkout.bind(this));
        
        inputType.addEventListener('change',this._toggleElevationField);
        
        containerWorkouts.addEventListener('click',this._moveToPopup.bind(this));

        cross.addEventListener('click',this._revert);

    }

    _getPosition(){
        if(navigator.geolocation)
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),function(){
            alert('Could not get your location');
        })
    }

    _loadMap(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        //console.log(longitude,latitude);
        // show clear all button
        const coords = [latitude,longitude];
        
        //console.log(this);
        
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        
        L.marker(coords).addTo(this.#map)
        .bindPopup('My location')
        .openPopup();
        
        this.#map.on('click',this._showForm.bind(this));
        
        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        })
    }

    _showForm(mapE) {
        this.#mapEvent=mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }
    _hideForm(){
        inputDistance.value=inputDuration.value=inputCadence.value=inputElevation.value='';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(()=>form.style.display='grid',1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => 
            inputs.every(inp => Number.isFinite(inp));

        const allPositive = (...inputs) => 
            inputs.every(inp=> inp>0);
        e.preventDefault();
        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat,lng} = this.#mapEvent.latlng;
        let workout;
        //if activity running ,create running object
        if(type === 'running'){
            const cadence = +inputCadence.value;
            //check if data valid
            if(!validInputs(distance,duration,cadence) || !allPositive(distance,duration,cadence)) 
                return alert('Input have to be positive')
            
            workout = new Running([lat,lng],distance,duration,cadence);
            
        }
        //if activity cycling ,create cycling object
        if(type === 'cycling'){
            const elevation = +inputElevation.value;
            //check if data valid
            if(!validInputs(distance,duration,elevation) || !allPositive(distance,duration)) 
                return alert('Input have to be positive')
            
            workout = new Cycling([lat,lng],distance,duration,elevation);
        }
        //add new object to workout array
        this.#workouts.push(workout);
        //console.log(workout);
        clear_all.classList.remove('hide'); //also show clearr all button
        //render workout on a map marker
        this._renderWorkoutMarker(workout);
        //render workout on list
        this._renderWorkout(workout);
        //hide form + clear Input fields
        this._hideForm()
        
        //Set local storage to all workouts
        this._setLocalStorage();
    }
    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 300,
            minWidth: 100,
            autoClose: false,
            closeOnClick:  false,
            className: `${workout.type}-popup`
        })).setPopupContent(`${workout.type === 'running'?'🏃‍♂️':'🚴‍♀️'} ${workout.descroption}`)
        .openPopup();
        
    }
    _renderWorkout(workout){
        let html=`
            <li class="workout workout--${workout.type}" data-id="${workout.id}">

            <h2 class="workout__title">${workout.descroption}</h2>
            <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running'?'🏃‍♂️':'🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
            </div>
        `;
        if(workout.type === 'running')
            html+=`
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
                </li>
            `;
        if(workout.type === 'cycling')
            html+=`
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
            </li>
            `;
        
        form.insertAdjacentHTML('afterend',html);
    }

    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout');
        //console.log(workoutEl);
        
        if(!workoutEl)  return;
        const workout = this.#workouts.find(
            work => work.id === workoutEl.dataset.id
        );
        
        //console.log(workout.coords);
        this.#map.setView(workout.coords,this.#mapZoomLevel,{
            animate: true,
            pan: {
                duration: 1,
            }
        });
        containerWorkouts.classList.add('hide');
        clear_all.classList.add('hide');
        weather_container.classList.remove('hide');
        getWeather(workout.coords[0],workout.coords[1]);
    }
    _revert(){
        containerWorkouts.classList.remove('hide');
        clear_all.classList.remove('hide');
        weather_container.classList.add('hide');
    }
    _setLocalStorage(){
        localStorage.setItem('workouts',JSON.stringify(this.#workouts));
    }
    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'));
        //console.log(data);
        if(!data)   return;

        this.#workouts=data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
            //console.log(work);
        })
    }
    reset(){
        clear_all.classList.add('hide');
        localStorage.removeItem('workouts');
        location.reload();
    }

}

const app = new App();

clear_all.addEventListener('click',function(){
    app.reset();
})