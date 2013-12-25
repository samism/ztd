var towerSelected = false;
var currentTower = undefined;
var goingFast = false;

function selectTower(tower){
	towerSelected = true;
	currentTower = tower;
	console.log('selected tower: ' + currentTower);
}

function fast(){
	if(roundStarted && !goingFast){
		game.fps += 10;
		goingFast = true;
	}
}

/*
(function() {
	var anchors = document.getElementsByTagName('a');
	for(var a in anchors){
		a.onclick = function(){
			if(this.style.backgroundColor == ''){ //default value
				this.style.backgroundColor = 'black';
			} else {
				this.style.backgroundColor = 'transparent';
			}
		};
	}
})();
*/