//refer to 9leap tower def: http://pastie.org/6631509
//lets gets started with enchant: http://enchantjs.com/tutorial/lets-start-with-enchant-js/
//enchant.js api: http://wise9.github.com/enchant.js/doc/core/en/index.html

enchant();

window.onload = function() {
	var game = new Game(352, 352);
	game.preload('floorsprites.png', 'zombies.png', 'spaceturrets.png', 'fireball.png', 'recycle.png');
	game.fps = 10;

	// game variables
	var map = new Map(32, 32);
	
	//map has to be designed so that path starting top left going down right
	var baseMap = [ // 0 is rock, 3 is grass; premade sample path here
			[ 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3 ], 
			[ 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3 ],
			[ 2, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3 ],
			[ 3, 3, 3, 3, 0, 3, 3, 3, 3, 3, 3 ],
			[ 3, 3, 3, 3, 0, 0, 0, 3, 3, 3, 3 ],
			[ 3, 3, 3, 3, 3, 3, 0, 3, 3, 3, 3 ],
			[ 3, 3, 3, 3, 3, 3, 0, 3, 3, 3, 3 ],
			[ 3, 3, 3, 3, 3, 3, 0, 3, 3, 3, 3 ],
			[ 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0 ],
			[ 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0 ],
			[ 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4 ] ];
	
	var enemies = [];
	var towers = [];

	var recycleBin = new Sprite(32, 32);
	
	var TowerTypes = {
			t1: 50,
			t2: 75,
			t3: 100,
			t4: 200
		};
	
	var num = 0;
	var frame = game.fps; //start out at 1 second
	var roundStarted = false;
	var roundStartFrame = 0;
	var round = 1;
	var money = 250; 
	var lives = 1; //100
	var score = 0; 
    var spawnPoint = undefined, goalPoint = undefined;
	var walk1 = 6, walk2 = 7; //portions of the walking animation
	var rock = 0, wood = 1, sand = 2, grass = 3, dirt = 4; //portions of the map sprite
	
	var moveRight = false, moveLeft = false, moveDown = false, moveUp = false;
	var spawnedZombies = false;

	var did = false;
	
	var clickedTower = undefined;
	
	var roundLabel = new Label('round: ' + round);
	var infoLabel = new Label(' life: ' + lives + " | score: " + score + ' | money: ' + money);
	var roundStartButton = new Label('START ROUND');
		
	/*		core part of the js		*/
	game.onload = function() {
		//load map
		map.image = game.assets['floorsprites.png'];
		map.loadData(baseMap);
		
		//load reycle bin
		recycleBin.image = game.assets['recycle.png'];
		recycleBin.frame = 0;
		recycleBin.x = 2;
		recycleBin.y = 315;

		//configure labels
		infoLabel.textAlign = 'left';
		infoLabel.color = 'white';
		infoLabel.y = 300;
		infoLabel.font = '15px times new roman';
		
		roundLabel.textAlign = 'right';
		roundLabel.color = 'yellow';
		roundLabel.y = 2;
		roundLabel.font = '16px times new roman';
		
		roundStartButton.textAlign = 'left';
		roundStartButton.color = 'red';
		roundStartButton.y = 2;
		roundStartButton.font = '20px sans serif';
	
		//find spawn and goal points of the path
		spawnPoint = findPoint(true); //find spawn
		goalPoint = findPoint(false); //find goal
		
		//this is like an update method
		game.addEventListener('enterframe', function(){ //enterframe event fires 10 times a second
			if(roundStarted){
				//if possible, have all towers shoot zombies within their range
				//optimize this later on. ineffecient at the moment
				for(var i = 0; i < towers.length; i++){
					for(var j = 0; j < enemies.length; j++){
						if(towers[i].isZombieNear(enemies[j])){
							towers[i].fireAt(towers[i].chooseZombie());
						}
					}
				}

				/*
				
				Jeffs idea for coding the subsequent-traversal pattern:

				-spawn the zombies for the round one by one instead of all at once 
				-move the currently spawned zombie, then once it is out of the way, spawn the next one and move it down
				-repeat until the number of zombies to spawn is reached
				-move them until they reach the end of the path

				*/
					
				//do things second by second
				if((game.frame - roundStartFrame) % frame == 0){ 
					if(!did){
						spawnZombies();
						console.log('spawned zombies: ' + enemies.length)
						did = true;
					}

					//enemies[num < round - 1 ? num++ : num].traverse();
					enemies[num].traverse();
					
					if(num < round - 1){
						alert('round: ' + round + ', num: ' + num);
						num++;
					}


					if(enemies.length == 0){ //only go to next round if all zombies are killed
						//reset variables
						if(lives == 0) {
							alert('No more lives left.\n\nGAME OVER\n\nRefresh to play again.');
							return;
						}
						console.log('round done');
						round++;
						roundStarted = false;
						spawnedZombies = false;	
						did = false;
						num = 0;

						for(var p in enemies){ //reset every round
							if(enemies.hasOwnProperty(p))
								enemies[p].hasMoved = false;	
						}	
					}

					frame += game.fps;
					updateLabels();
				}

				game.frame++;
			} else {
				frame = game.fps;
			}
		});

		//adding towers
		game.rootScene.addEventListener('touchstart', function(e){
			var _x = Math.round(e.x);
			var _y = Math.round(e.y);
			
			//if trying to place a tower
			if(towerSelected && map.checkTile(_x, _y) == grass && money >= TowerTypes[currentTower]){
				towers.push(new Tower(currentTower, _x,  _y, towers.length)); 
			} else if(!towerSelected){ //if clicked a tower on the map that was already placed
				for(var i = 0; i < towers.length; i++){
					if(towers[i].x == _x && towers[i].y == _y){
						clickedTower = towers[i]; //find which tower we clicked on
					}
				}
			}
			towerSelected = false;
		});
		
		//remove towers
		game.rootScene.addEventListener('touchend', function(e){
			var _x = Math.round(e.x);
			var _y = Math.round(e.y);

			//if click was released on the recycle bin, sell tower
			if(clickedTower != undefined && clickedTower.within(recycleBin) && !towerSelected){
				var cash = clickedTower.cost / 2; //return half of what was paid for when the tower was bought
				money += cash;
				towers = towers.splice(clickedTower.id, 1); //remove the Tower from the array

				console.log('tower ' + clickedTower.id + 'sold for: ' + cash);

				clickedTower = undefined;
			}
		});
		
		//round start button
		roundStartButton.addEventListener('touchstart', function(){
			roundStarted = true;
			roundStartFrame = game.frame;
		});
		
		game.rootScene.addChild(map);
		game.rootScene.addChild(recycleBin);
		game.rootScene.addChild(roundStartButton);
		game.rootScene.addChild(roundLabel);
		game.rootScene.addChild(infoLabel);

		alert('Welcome to Zombies Tower Defense!\n\nTo play the game, prevent the zombies from getting to the end of the path. Select a tower from the tower bank.\n\nThat is all.')
		
	};
	
	
	/*		objects & methods		*/
	function Tower(type, x, y, id) {
		this.type = type;
		this.id = id;
		this.cost = TowerTypes[currentTower];

		this.sprite = new Sprite(25, 35);
		this.sprite.image = game.assets['spaceturrets.png'];
		this.sprite.x = x - (this.sprite.width / 2); //spawn at the center of the click
		this.sprite.y = y - (this.sprite.height / 2);
		
		this.nearbyZombies = [];
		
		switch(this.type){
		case 't1':
			this.sprite.frame = 0;
			this.fireSpeed = 1;
			this.range = 32; 
			break;
		case 't2':
			this.sprite.frame = 1;
			this.fireSpeed = 3;
			this.range = 48; //1.5x
			break;
		case 't3':
			this.sprite.frame = 2;
			this.fireSpeed = 5;
			this.range = 56; //1.75x
			break;
		case 't4':
			this.sprite.frame = 3;
			this.fireSpeed = 10;
			this.range = 96; //3x
			break;
		}
		
		this.ammoSprite = new Sprite(16, 16);
		this.ammoSprite.image = game.assets['fireball.png'];
		this.ammoSprite.frame = 0; //frame changes depending on the direction firing
		this.ammoSprite.x = this.sprite.x;
		this.ammoSprite.y = this.sprite.y;
		
		money -= this.cost;
		updateLabels();
		
		game.rootScene.addChild(this.sprite);
	}
	
	Tower.prototype.isZombieNear = function(zombie){
		//distance formula = sqrt((x2-x1)^2+(y2-y1)^2)
		var dist = Math.sqrt(Math.pow(this.sprite.x - zombie.sprite.x, 2) + Math.pow(this.sprite.y - zombie.sprite.y, 2));
		return dist <= this.range;
	};
	
	//if found, return the zombie closest to the end of the path, that is still within range of the tower.
	//uses distance formula
	Tower.prototype.chooseZombie = function(){
		
	};
	
	//limit this to like 5 shots per second
	Tower.prototype.fireAt = function(zombie){
		
	};
	
	function Zombie(life, id) {
		this.life = life;
		this.id = id;
		
		this.prevPoint = spawnPoint;

		this.sprite = new Sprite(32, 32);
		this.sprite.image = game.assets['zombies.png'];
		this.sprite.frame = walk1;

		this.sprite.x = spawnPoint.realX - 32 * id;
		this.sprite.y = spawnPoint.realY;
		
		this.traversedFully = false;
		this.killedEarly = false;
		this.isFirstMove = true;
		this.hasMoved = false;

		game.rootScene.addChild(this.sprite);
	}
	
	//traverse a zombie 1 unit down the path in the direction of the goal point
	//don't modify this function. it is perfected
	Zombie.prototype.traverse = function traverse(){		
		//if tower killed zombie before it could reach the goal point
		if(this.life <= 0)
			this.killedEarly = true;

		//traverses the rock path if current position is not goal position
		if(this.sprite.x != goalPoint.realX && this.sprite.y != goalPoint.realY && !this.killedEarly){
			if(map.checkTile(this.sprite.x, this.sprite.y + 32) != grass 
					&& (this.sprite.y + 32 <= 352 || this.isFirstMove)) //down
				moveDown = true;
			
			if(map.checkTile(this.sprite.x + 32, this.sprite.y) != grass 
					&& (this.sprite.x + 32 <= 352 || this.isFirstMove)) //right
				moveRight = true;
			
			if(map.checkTile(this.sprite.x, this.sprite.y - 32) != grass 
					&& (this.sprite.y - 32 >= 0 || this.isFirstMove)) //up
				moveUp = true;
			
			if(map.checkTile(this.sprite.x - 32, this.sprite.y) != grass 
					&& (this.sprite.x - 32 >= 0 || this.isFirstMove)) //left
				moveLeft = true;
			
			//debugging purposes
			// if(false) {
			// 	var log = '';
				
			// 	if(moveUp)
			// 		log += 'moveUp ';
			// 	if(moveDown)
			// 		log += 'moveDown ';
			// 	if(moveLeft) 
			// 		log += 'moveLeft ';
			// 	if(moveRight)
			// 		log += 'moveRight ';
				
			// 	console.log('-------------------------')
			// 	console.log('zombie ' + this.id + ' out of ' + enemies.length);
			// 	console.log('prevPoint: ' + this.prevPoint.toString());
			// 	console.log('currentPosition:' + new Point(this.sprite.x, this.sprite.y).toString());
			// 	console.log('goal position: ' + goalPoint.toString());
			// 	console.log(log);
			// }
	
			if(moveLeft && moveDown){ //left & down
				if(this.prevPoint.realY == this.sprite.y){ //in the same column, choose to go down
					this.sprite.y += 32;
					this.sprite.rotation = 0;
					this.sprite.rotate(90);
					this.prevPoint = new Point(this.sprite.x, this.sprite.y - 32);
				} else if(this.prevPoint.realX == this.sprite.x){ //in the same column choose to go left
					this.sprite.x -= 32;
					this.sprite.rotation = 0;
					this.sprite.rotate(-180);
					this.prevPoint = new Point(this.sprite.x + 32, this.sprite.y);
				}
			} else if(moveLeft && moveUp){ //left & up
				if(this.prevPoint.realY == this.sprite.y){ //in the same row, choose to go up
					this.sprite.y -= 32;
					this.sprite.rotation = 0;
					this.sprite.rotate(-90);
					this.prevPoint = new Point(this.sprite.x, this.sprite.y + 32);
				} else if(this.prevPoint.realX == this.sprite.x){ //in the same column choose to go right
					this.sprite.x -= 32;
					this.sprite.rotation = 0;
					this.sprite.rotate(-180);
					this.prevPoint = new Point(this.sprite.x + 32, this.sprite.y);
				}
			} else if(moveRight && moveDown){ //right & down
				if(this.prevPoint.realY == this.sprite.y){ //in the same col, choose to go down
					this.sprite.y += 32;
					this.sprite.rotation = 0;
					this.sprite.rotate(90);
					this.prevPoint = new Point(this.sprite.x, this.sprite.y - 32);
				} else if(this.prevPoint.realX == this.sprite.x){ //in the same column choose to go right
					this.sprite.x += 32;
					this.sprite.rotation = 0;
					this.prevPoint = new Point(this.sprite.x - 32, this.sprite.y);
				}
			} else if(moveRight && moveUp){ //right & up
				if(this.prevPoint.realY == this.sprite.y){ //in the same row, choose to go down
					this.sprite.y += 32;
					this.sprite.rotation = 0;
					this.sprite.rotate(90);
					this.prevPoint = new Point(this.sprite.x, this.sprite.y - 32);
				} else if(this.prevPoint.realX == this.sprite.x){ //in the same column choose to go right
					this.sprite.x += 32;
					this.sprite.rotation = 0;
					this.prevPoint = new Point(this.sprite.x - 32, this.sprite.y);
				}
			} else if(moveDown && moveUp){ //straight up/down
				if(this.sprite.y - this.prevPoint.realY == 32){
					this.sprite.y += 32;
					this.prevPoint = new Point(this.sprite.x, this.sprite.y - 32);
				} else if(this.sprite.y - this.prevPoint.realY == -32){
					this.sprite.y -= 32;
					this.prevPoint = new Point(this.sprite.x, this.sprite.y + 32);
				}
			} else if(moveRight && moveLeft){ //straight right/left
				if((this.sprite.x - this.prevPoint.realX == 32) || this.isFirstMove){
					this.sprite.x += 32;
					this.prevPoint = this.isFirstMove ? this.prevPoint : new Point(this.sprite.x - 32, this.sprite.y);
				} else if(this.sprite.x - this.prevPoint.realX == -32){
					this.sprite.x -= 32;
					this.prevPoint = this.isFirstMove ? this.prevPoint : new Point(this.sprite.x + 32, this.sprite.y);
				}
			} else {
				console.log(this.id);
			}
			
			switch(this.sprite.frame){ //animate the zombies as they follow the path
			case walk1:
				this.sprite.frame++;
				break;
			case walk2:
				this.sprite.frame--;
				break;
			}
			
			this.hasMoved = true;
			this.isFirstMove = false;
			moveDown = false, moveRight = false, moveUp = false, moveLeft = false;
		} else {	
			if(!this.killedEarly)
				this.traversedFully = true;

			if(this.traversedFully){
				lives--;
			} else if (killedEarly){
				money += TowerTypes[currentTower];
				score += 25;
			}

			enemies.shift();

		// 	if(this.killedEarly){
		// 		score += 25;
		// 	} else {
		// 		this.traversedFully = true;

		// 		console.log('enemies before: ' + listArray(enemies));
		// 		console.log('zombie id: ' + this.id + ' out | new enemies.length: ' + (enemies.length - 1));
		// 		console.log(this.toString());

		// 		enemies.shift(); //Array.pop() caused bug, shift() messes up the indices

		// 		console.log('enemies after: ' + listArray(enemies));

		// 		lives--; //only take a life if it made it down the path without dying
		// 	}
		}
	};

	Zombie.prototype.toString = function() {
		var props = '';
		for(var p in this){
			if(typeof this[p] !== 'function' && typeof this[p] !== 'object'){
				props += p + ': ' + this[p] + ', ';
			}
		}
		return '{' + props + '}';
	};

	function spawnZombies(){
		if(!spawnedZombies){
			console.log('--------------------------');
			console.log('round ' + round);
			for(var i = 0; i < round; i++){ //# of zombies per round = round^2?
				enemies.push(new Zombie(round * 1.5, i)); //each zombie has 1.5r life where r = round #
			}
			spawnedZombies = true;
		}
	}

	function spawnZombie(){
		enemies.push(new Zombie(round * 1.5, enemies.length)); 
	}
	
	function Point(x, y){
		if(x > 11 || y > 11){ 	//passed in real
			this.realX = x;
			this.realY = y;
			this.gridX = x / 32;
			this.gridY = y / 32;
		} else {				//passed in grid
			this.realX = x * 32;
			this.realY = y * 32;
			this.gridX = x;
			this.gridY = y;
		}
	}
	
	//realX/Y = the pixel values (0-352)
	//gridX/Y = the array values (0-11)
	Point.prototype.toString = function toString(){
		return "(x: " + this.gridX + '|' + this.realX + ', y: ' + this.gridY + "|" + this.realY + ")";
	};
	
	/*		helper functions		*/	
	function listArray(arr){
		var list = '';
		for(var e = 0; e < arr.length; e++){
			list += arr[e].id + ((arr.length - 1 == e) ? "" : ', ');
		}
		return '[' + list + ']';
	}

	function updateLabels(){		
		roundLabel.text = 'round: ' + round;
		infoLabel.text = ' life: ' + lives + " | score: " + score + ' | money: ' + money;
	}

	//pass spawn as true for the spawn point, false for goalPoint
	function findPoint(spawn) {
		for (var i = 0; i < baseMap.length; i++) {
			for (var j = 0; j < baseMap.length; j++) {
				if (baseMap[i][j] == 2 && spawn){
					return new Point(j, i);
				} else if(baseMap[i][j] == 4 && !spawn){
					return new Point(j + 1, i + 1);
				}
			}
		}
	}
	
	
	game.start();
}