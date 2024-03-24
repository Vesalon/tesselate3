function scaleCanvas(canvas, context, width, height) {
    // source: https://gist.github.com/callumlocke/cc258a193839691f60dd

    // assume the device pixel ratio is 1 if the browser doesn't specify it
    const devicePixelRatio = window.devicePixelRatio || 1;
    const ratio = devicePixelRatio;

    if (devicePixelRatio !== 1) {
        // set the 'real' canvas size to the higher width/height
        canvas.width = width * ratio;
        canvas.height = height * ratio;

        // ...then scale it back down with CSS
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
    }
    else {
        // this is a normal 1:1 device; just scale it simply
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '';
        canvas.style.height = '';
    }

    // scale the drawing context so everything will work at the higher ratio
    context.scale(ratio, ratio);
}

function setup() {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    canvas.width = w = window.innerWidth;
    canvas.height = h = window.innerHeight;
    scaleCanvas(canvas, ctx, w, h);
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgb(255, 255, 255)";

    viz_width = 1000;
    viz_height = 800;
    max_verts = 700;
    loop_counter = 0;
    var proto_v0 = math.matrix([0, 0, 0]);
    var proto_v1 = math.matrix([70, -19, 0]);
    var proto_v2 = math.matrix([14, 40, 0]);
    diffs = [proto_v0, proto_v1, proto_v2];

    center_offset = math.matrix([w/2, h/2, 0]);
    display_buff = 50;
    nudge();
    vertices = get_vertices();
    looping = true;
    window.requestAnimationFrame(draw);
}

function pause() {
    if (looping) {
        looping = false;
    } else {
        looping = true;
    }
}

function translation_matrix(horiz_shift, vert_shift){
    return math.matrix([[1, 0, horiz_shift], [0, 1, vert_shift], [0, 0, 1]]);
}

function rotation_matrix(theta){
    return math.matrix([
        [math.cos(theta), -1*math.sin(theta), 0],
        [math.sin(theta), math.cos(theta), 0],
        [0, 0, 1],
    ]);
}

function scale_matrix(r){
    return math.matrix([[r, 0, 0], [0, r, 0], [0, 0, 1]])
}

function get_vertices() {
    var v = math.matrix([0, 0, 1]);
    var vertices = [];
    var num_rows = 1.5*h/diffs[2].valueOf()[1];
    var num_cols = 1.5*w/diffs[1].valueOf()[0];
    var y_start = math.floor(-1*num_rows/2);
    var y_end = math.ceil(num_rows/2);
    var x_start = math.floor(-1*num_cols/2);
    var x_end = math.ceil(num_cols/2);
    for (var i = y_start; i < y_end; i++) {
        for (var j = x_start; j < x_end; j++) {
            var xdiff = math.multiply(j, diffs[1]);
            var ydiff = math.multiply(i, diffs[2]);
            center_offset = math.matrix([w/2, h/2, 0]);
            var v_ = math.chain(v).add(xdiff).add(ydiff).add(center_offset).done();
            p = v_.valueOf();
            if (p[0] > -1*display_buff & p[0] < w+display_buff & p[1] > -1*display_buff & p[1] < h + display_buff){
                vertices.push(v_);
            } 
        }
    }
    return vertices
}

function nudge(max_jump=0.07){
    nudge_vecs = [math.zeros(3), math.zeros(3), math.zeros(3)];
    for(var i = 1; i < nudge_vecs.length; i++){ 
        v = math.matrix([
            max_jump*2*(Math.random()-0.5),
            max_jump*2*(Math.random()-0.5),
            0
        ]);
        nudge_vecs[i] = v

    }
}

function draw_curve(p0, p1, skew, color='white') {
    ctx.save();
    var mid_p = math.chain(p0).add(p1).divide(2).done();
    var intermediate0 = math.subtract(mid_p, skew);
    var intermediate1 = math.add(mid_p, skew);
    var v0 = p0.valueOf();
    var v1 = intermediate0.valueOf();
    var v2 = intermediate1.valueOf();
    var v3 = p1.valueOf();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(v0[0], v0[1]);
    ctx.lineTo(v1[0], v1[1]);
    ctx.lineTo(v2[0], v2[1]);
    ctx.lineTo(v3[0], v3[1]);
    ctx.stroke();
    ctx.restore();
}

function triangle(x0, y0, x1, y1, x2, y2){
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x0, y0);
    ctx.stroke();
}

function rose(k, theta, max_radius){
    var r = math.chain(k*theta).cos().multiply(max_radius).done();
    return math.multiply(rotation_matrix(theta), math.matrix([r, 0, 0]));
}

function spacial_ind0(v, spacial_period = 60){
    return math.floor((3*v[0] + v[1])/spacial_period);
}

function spacial_ind1(v, spacial_period = 45){
    return math.floor(-(2*v[0] + 3*v[1])/spacial_period);
}

function spacial_ind2(v, spacial_period = 75){
    return math.floor((3*v[1])/spacial_period);
}

function gen_skew(v, period, max_rad, spacial_ind, dir = 1, k = 3){
    return rose(k, (2*dir*(math.PI)/period)*(loop_counter + spacial_ind), max_rad);
}

function update_shape(momentum_period=100){
    if (vertices.length > max_verts){
        for (var i = 0; i < nudge_vecs.length; i++){
            nudge_vecs[i] = math.multiply(-1, nudge_vecs[i]);
        }
    }
    if (loop_counter%momentum_period == 0){
        nudge();
    }
    for(var i = 1; i < diffs.length; i++) {
        diffs[i] = math.add(diffs[i], nudge_vecs[i]);
    }
}

function draw() {
    if (!looping){
        window.requestAnimationFrame(draw);
        return;
    }
    ctx.fillRect(0, 0, w, h);
    loop_counter++;

    for (var i = 0; i < vertices.length; i++) {
        var v0 = vertices[i].valueOf();
        var v1 = math.add(vertices[i], diffs[1]).valueOf();
        var v2 = math.add(vertices[i], diffs[2]).valueOf();
        var skew0 = gen_skew(v0, 390, 13, spacial_ind0(v0), dir=1, k = 3.5);
        var skew1 = gen_skew(v0, 360, 9, spacial_ind1(v0), dir = 1, k = 4);
        var skew2 = gen_skew(v0, 460, 15, spacial_ind2(v0), dir = -1);
        draw_curve(v0, v1, skew0);
        draw_curve(v1, v2, skew1);
        draw_curve(v2, v0, skew2);
    }

    update_shape();
    vertices = get_vertices();
    window.requestAnimationFrame(draw);
}

window.addEventListener("load", setup);
document.addEventListener("keypress", pause);
