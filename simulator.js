Array.prototype.get2DNeighbors = function(current_row, current_col) {
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, 1], [1, 1], [1, 0], [1, -1],
        [0, -1]
    ];

    const neighbors = [];

    directions.forEach(([dRow, dCol]) => {
        const newRow = current_row + dRow;
        const newCol = current_col + dCol;

        if (
            newRow >= 0 && newRow < this.length &&
            newCol >= 0 && newCol < this[0].length
        ) {
            const cell = this[newRow][newCol];
            if (cell.type !== 'wall') {
                neighbors.push(cell);
            }
        }
    });

    return neighbors;
};

Array.prototype.get2DNeighborsWithWeight = function(current_row, current_col) {
    const directions = [
        [0, -1, 1], [1, 0, 1], [0, 1, 1], [-1, 0, 1],
        [1, -1, 1.4], [1, 1, 1.4], [-1, 1, 1.4], [-1, -1, 1.4]
    ];
    
    const neighbors = [];
    
    for (const [dRow, dCol, baseWeight] of directions) {
        const newRow = current_row + dRow;
        const newCol = current_col + dCol;
        if (
            newRow >= 0 && newRow < this.length &&
            newCol >= 0 && newCol < this[0].length
        ) {
            const cell = this[newRow][newCol];
            if (cell.type !== 'wall') {
                // Total weight is base direction cost + cell's custom weight
                const totalWeight = baseWeight + cell.weight;
                neighbors.push({ cell, weight: totalWeight });
            }
        }
    }
    
    return neighbors;
    
};


class Simulator extends HTMLElement {
    constructor() {
        super();
        this.speed = 50;

        this.rows = parseInt(this.getAttribute('rows')) || 10;
        this.cols = parseInt(this.getAttribute('cols')) || 10; 
        this.arr = [];

        this.simulation_state = 'creative'
        this.isMouseDown = false;
        this.grid = null
        this.start_cell = null
        this.end_cell = null 
        this.cell_click_handler = 'wall'
    }
    connectedCallback() {
        this.algo = this.getAttribute('algo') || 'bfs';
        const panel = this
        while (panel.firstChild) {
            panel.removeChild(panel.firstChild);
        }

        this.render();
    }
    reset() {
        this.arr = [];

        this.simulation_state = 'creative'
        this.start_cell = null
        this.end_cell = null 
        this.connectedCallback();
    }
    static Queue = class {
        constructor() {
        this.items = {};
        this.head = 0;
        this.tail = 0;
        }

        push(element) {
            element.style.backgroundColor = 'blue';
            element.isVisited = true;
            this.items[this.tail] = element;
            this.tail++;
        }

        pop() {
            if (this.isEmpty()) return null;

            const value = this.items[this.head];
            delete this.items[this.head];
            this.head++;
            value.style.backgroundColor = 'yellow';
            return value;
        }

        isEmpty() {
            return this.head === this.tail;
        }
    };
    static Stack = class {
        constructor() {
            this.items = {};
            this.top = 0;
        }
    
        push(element) {
            element.style.backgroundColor = 'blue';
            element.isVisited = true;
            this.items[this.top] = element;
            this.top++;
        }
    
        pop() {
            if (this.isEmpty()) return null;
    
            this.top--;
            const value = this.items[this.top];
            delete this.items[this.top];
            value.style.backgroundColor = 'yellow';
            return value;
        }
    
        isEmpty() {
            return this.top === 0;
        }
    };
    static PriorityQueue = class {
        constructor(key = 'dist') {
            this.items = [];
            this.key = key;
        }
    
    
        push(node) {
            node.cell.style.backgroundColor = 'gray';
            this.items.push(node);

            this.items.sort((a, b) => a[this.key] - b[this.key]);
        }
    
        pop() {
            if (this.isEmpty()) return null;
    
            const node = this.items.shift();
            node.cell.style.backgroundColor = 'yellow';
            return node;
        }
    
        isEmpty() {
            return this.items.length === 0;
        }
    };
    
    buildGrid() {
        // Remove old grid if it exists
        if (this.grid) this.grid.remove();
        this.arr = [];

        const grid_container_div = document.createElement('div');
        grid_container_div.id = 'grid-container';
        grid_container_div.classList.add('grid-map')
        this.grid = grid_container_div

        grid_container_div.style.gridTemplateColumns = `repeat(${this.cols}, 40px)`;
        grid_container_div.style.gridTemplateRows = `repeat(${this.rows}, 40px)`;

        for (let r = 0; r < this.rows; r++) {
            const col = []
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                grid_container_div.appendChild(cell);
                cell.classList.add('cell');
                cell.isNotDraggable = true;
                cell.type = 'empty'
                cell.row = r;
                cell.col = c;
                cell.weight = 0;
                cell.isVisited = false;
                cell.setType = function (type = 'empty') {
                    const types = ['empty', 'start', 'end', 'wall'];
                    types.forEach(t => this.classList.remove(t));
                    this.classList.add(type);
                    this.type = type;
                
                    // Make only start/end draggable
                    this.setAttribute('draggable', type === 'start' || type === 'end');
                };
                  
                // for toggling walls
                const togglewall = () => {
                    if(cell.type == 'start' || cell.type == 'end'){
                        return
                    }
                    cell.type == 'empty' ? cell.setType('wall') : cell.setType('empty')
                    cell.weight = 0;
                    cell.style.backgroundColor = 'white'; // not good. TODO: make cellweight adjustments handled by cell.someFunction()
                }
                const addWeight = () => {
                    if (cell.type === 'empty') {
                        cell.weight += 1;
                
                        const maxWeight = 5; // Adjust as needed TODO: Add this to settings
                        const factor = Math.min(cell.weight / maxWeight, 1); 

                        const start = 255;
                        const end = 47;
                        const value = Math.round(start - (start - end) * factor);

                        cell.style.backgroundColor = `rgb(${value}, ${value}, ${value})`;
                    }
                };
                cell.addEventListener('click', () => {
                    this.cell_click_handler == 'wall' ? togglewall() : addWeight();
                });
                let isMouseDown = false;
                document.addEventListener('mousedown', () => isMouseDown = true);
                document.addEventListener('mouseup', () => isMouseDown = false);

                cell.addEventListener('mouseover', () => {
                    if (isMouseDown) {
                        this.cell_click_handler == 'wall' ? togglewall() : addWeight();
                    }
                });

                cell.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ row: cell.row, col: cell.col, type: cell.type }));
                });
                
                cell.addEventListener('dragover', (e) => {
                    e.preventDefault(); // Allow drop
                });
                
                cell.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                
                    const sourceCell = this.arr[data.row][data.col];
                    const targetCell = this.arr[cell.row][cell.col];
                
                    // Don't allow drop on wall
                    if (targetCell.type === 'wall') return;
                
                    if (sourceCell.type === 'start') this.start_cell = targetCell;
                    if (targetCell.type === 'start') this.start_cell = sourceCell;
                    if (sourceCell.type === 'end') this.end_cell = targetCell;
                    if (targetCell.type === 'end') this.end_cell = sourceCell;
                    
                    sourceCell.setType(targetCell.type);
                    targetCell.setType(data.type);    
                });
                
                col.push(cell)
            }
            this.arr.push(col)
        }
        const start_cell = this.arr[0][0]
        const end_cell = this.arr[this.rows-1][this.cols-1]
        start_cell.setType('start')
        end_cell.setType('end')
        this.start_cell = start_cell
        this.end_cell = end_cell

        return grid_container_div
    }

    // TODO: This works, but clean it up soon
    getAlgo() {
        const bfs = (speed=20) => {
            const queue = new Simulator.Queue();
            let current_cell = this.start_cell;
            queue.push(current_cell)
            const animate = () => {
                if(current_cell === this.end_cell){
                    console.log('congrats')
                    return
                }
        
                const neighbors = this.arr.get2DNeighbors(current_cell.row, current_cell.col);
                for(let n of neighbors){
                    if (n.type != 'wall' && !n.isVisited){
                        queue.push(n)
                    }
                }
                if(queue.isEmpty()){
                    console.log('failed');
                    return
                }
                current_cell = queue.pop();
                setTimeout(animate,speed);
            }
            animate();
        }
        const dfs = (speed=20) => {
            const queue = new Simulator.Stack();
            let current_cell = this.start_cell;
            queue.push(current_cell)
            const animate = () => {
                if(current_cell === this.end_cell){
                    console.log('congrats')
                    return
                }
                const neighbors = this.arr.get2DNeighbors(current_cell.row, current_cell.col);
                for(let n of neighbors){
                    if (!n.isVisited){
                        queue.push(n)
                    }
                }
                if(queue.isEmpty()){
                    console.log('failed');
                    return
                }
                current_cell = queue.pop();
                setTimeout(animate,speed);
            }
            animate();
        }
        const djk = (speed=20) => {
            const q = new Simulator.PriorityQueue();
            const visited_cells = new Set();

            let current_node = { cell: this.start_cell, dist: 0, prev: null }
            q.push(current_node)

            const animate = () => {
                if(current_node.cell === this.end_cell){
                    console.log('congrats')
                    const out = []

                    while(current_node.prev){
                        current_node.cell.style.backgroundColor = 'green'
                        out.push(current_node.cell)
                        current_node = current_node.prev
                    }
                    console.log(out)
                }
                const children = this.arr.get2DNeighborsWithWeight(current_node.cell.row, current_node.cell.col);
                for(let child_node of children){ 
                    if ( child_node.dist == undefined ) {
                        child_node.dist = current_node.dist + child_node.weight;
                        child_node.prev = current_node
                    }
                    else {
                        const cur_to_child = current_node.dist + child_node.weight;
                        if(cur_to_child < child_node.dist){
                            child_node.dist = cur_to_child
                            child_node.prev = current_node
                        }
                        
                    }
                    if(!visited_cells.has(child_node.cell)){
                        visited_cells.add(child_node.cell)
                        console.log(child_node.cell.weight)
                        q.push(child_node)
                    }
                }

                if(q.isEmpty()){
                    console.log('no way')
                    return
                }

                current_node = q.pop();
                setTimeout(animate,speed);
            }
            animate();
        }
        const astar = (speed=20) => {
            const q = new Simulator.PriorityQueue('mdist');
            const visited_cells = new Set();

            let current_node = { cell: this.start_cell, dist: 0, prev: null }
            q.push(current_node)

            const animate = () => {
                if(current_node.cell === this.end_cell){
                    console.log('congrats')
                    const out = []

                    while(current_node.prev){
                        current_node.cell.style.backgroundColor = 'green'
                        out.push(current_node.cell)
                        current_node = current_node.prev
                    }
                    console.log(out)
                    return
                }
                const children = this.arr.get2DNeighborsWithWeight(current_node.cell.row, current_node.cell.col);
                for(let child_node of children){ 
                    if ( child_node.dist == undefined ) {
                        child_node.dist = current_node.dist + child_node.weight;
                        child_node.prev = current_node
                    }
                    else {
                        const cur_to_child = current_node.dist + child_node.weight;
                        if(cur_to_child < child_node.dist){
                            child_node.dist = cur_to_child
                            child_node.prev = current_node
                        }
                        
                    }
                    if(!visited_cells.has(child_node.cell)){
                        const mdist = Math.abs(this.end_cell.row - child_node.cell.row) + Math.abs(this.end_cell.col - child_node.cell.col);
                        console.log(mdist)
                        child_node.mdist = child_node.dist + mdist;
                        visited_cells.add(child_node.cell)
                        q.push(child_node)
                    }
                }

                if(q.isEmpty()){
                    console.log('no way')
                    return
                }

                current_node = q.pop();
                setTimeout(animate,speed);
            }
            animate();
        }

        if(this.algo == 'bfs')
            return bfs
        if(this.algo == 'dfs')
            return dfs
        if(this.algo == 'djk')
            return djk
        if (this.algo == 'astar')
            return astar
        return ()=>console.log('ERROR: invalid algo')
    }

    simulate(){
        const algo = this.getAlgo();
        algo(this.speed);
    }

    setSimulationState(state) {
        const states = ['creative', 'select-start', 'select-end', 'simulating']
        if (!states.includes(state)) return
        this.simulation_state = state
    }

    render() {
        const title = document.createElement('h2');
        title.style.width = '100%';
        title.style.color = 'white';
        title.innerHTML = this.getAttribute('title') || 'Untitled';

        this.append(title)
        const grid = this.buildGrid();
        this.insertBefore(grid, title.nextSibling);

        const panel = document.createElement('div');
        const simulate_button = document.createElement('button');
        const reset_button = document.createElement('button');

        simulate_button.innerHTML = 'Play'
        reset_button.innerHTML = 'Reset'

        reset_button.classList.add('reset')
        simulate_button.classList.add('simulate-button')
        
        reset_button.onclick = () => this.reset(); 
        simulate_button.onclick = () => this.simulate();

        panel.classList.add('panel');

        const close_button = document.createElement('button');
        close_button.innerHTML = 'X';
        close_button.classList.add('close-button');

        close_button.onclick = () => {
            const parent = this.parentElement;
            this.remove();
            if (parent) parent.remove();
        };

        this.appendChild(close_button);
        this.appendChild(panel);

        //speed slider
        const top_SpeedDelay = 800;
        const simulation_control = document.createElement('div');
        simulation_control.classList.add('simulation-control');

        const speed_label = document.createElement('label');
        speed_label.classList.add('speed-label');
        speed_label.innerText = 'Speed:';

        const speed_slider = document.createElement('input');
        speed_slider.setAttribute('type', 'range');
        speed_slider.setAttribute('min', '0');
        speed_slider.setAttribute('max', top_SpeedDelay.toString());
        speed_slider.setAttribute('value', top_SpeedDelay - this.speed);
        speed_slider.classList.add('speed-slider');

        // Update speed dynamically
        speed_slider.addEventListener('input', () => {
            this.speed = parseInt(top_SpeedDelay - speed_slider.value);
        });


        // row col control group
        const dimensionControls = document.createElement('div');
        dimensionControls.classList.add('dimension-controls');

        // Create a group wrapper for inputs and labels
        const rowGroup = document.createElement('div');
        rowGroup.classList.add('input-group');

        const rowLabel = document.createElement('label');
        rowLabel.textContent = 'Rows:';
        rowLabel.htmlFor = 'row-input';

        const rowInput = document.createElement('input');
        rowInput.id = 'row-input';
        rowInput.type = 'number';
        rowInput.min = 10;
        rowInput.max = 100;
        rowInput.step = 1;
        rowInput.value = this.rows;
        rowInput.placeholder = 'Rows';
        rowInput.classList.add('dimension-input', 'row-input');

        rowInput.addEventListener('input', () => {
            const val = parseInt(rowInput.value);
            if (!isNaN(val)) {
                this.rows = Math.min(100, Math.max(10, val));
            }
        });

        rowGroup.appendChild(rowLabel);
        rowGroup.appendChild(rowInput);

        // Columns group
        const colGroup = document.createElement('div');
        colGroup.classList.add('input-group');

        const colLabel = document.createElement('label');
        colLabel.textContent = 'Cols:';
        colLabel.htmlFor = 'col-input';

        const colInput = document.createElement('input');
        colInput.id = 'col-input';
        colInput.type = 'number';
        colInput.min = 10;
        colInput.max = 100;
        colInput.step = 5;
        colInput.value = this.cols;

        colInput.placeholder = 'Columns';
        colInput.classList.add('dimension-input', 'col-input');

        colInput.addEventListener('input', () => {
            const val = parseInt(colInput.value);
            if (!isNaN(val)) {
                this.cols = Math.min(100, Math.max(10, val));
            }
        });

        // weight/wall button
        const weight_button = document.createElement('button')
        weight_button.innerHTML = 'add weight'
        
        weight_button.addEventListener('click', () => {
            this.cell_click_handler = this.cell_click_handler === 'wall' ? 'weight' : 'wall';
            weight_button.innerHTML = weight_button.innerHTML === 'add walls' ? 'add weight': 'add walls';
            weight_button.classList.toggle('add_walls_state');
        });
          

        colGroup.appendChild(colLabel);
        colGroup.appendChild(colInput);

        
        simulation_control.appendChild(speed_label);
        simulation_control.appendChild(speed_slider);
        simulation_control.appendChild(weight_button);
        simulation_control.appendChild(simulate_button);

        // Append all to main control container
        dimensionControls.appendChild(rowGroup);
        dimensionControls.appendChild(colGroup);
        dimensionControls.appendChild(reset_button);


        panel.appendChild(simulation_control);
        panel.appendChild(dimensionControls);


    }
}
customElements.define('path-finding-simulator', Simulator);