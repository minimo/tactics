/*

    easyTools.js
    2013/02/08
	This program is MIT lisence.

*/

var tools;

//乱数発生 0～max-1
function tools.rand( max ){ return ~~(Math.random() * max); }

//弧度法toラジアン変換
var tools.toRad = 3.14159/180;
//ラジアンto弧度法変換
var tools.toDeg = 180/3.14159;

//二点間の距離
function tools.distance(x1, y1, x2, y2) {
	var a = x2-x1;
	var b = y2-y1;
    return Math.sqrt(a*a+b*b);
}

//二点間の角度（水平x方向が０度　上側が正、下側が負）
function tools.angle(x1, y1, x2, y2) {
	return Math.atan2(y2-y1, x2-x1)*toDeg;
}

