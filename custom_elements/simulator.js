Array.prototype.get2DNeighbors = function(current_row, current_col, options = {}) {
    const {
        withWeight = false,
        allowDiagonals = true
    } = options;

    const cardinalDirections = [
        [-1, 0, 1],  // up
        [0, 1, 1],   // right
        [1, 0, 1],   // down
        [0, -1, 1]   // left
    ];

    const diagonalDirections = [
        [-1, -1, 1.4], // up-left
        [-1, 1, 1.4],  // up-right
        [1, 1, 1.4],   // down-right
        [1, -1, 1.4]   // down-left
    ];

    const directions = allowDiagonals
        ? cardinalDirections.concat(diagonalDirections)
        : cardinalDirections;

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
                if (withWeight) {
                    const totalWeight = baseWeight + (cell.weight || 0);
                    neighbors.push({ cell, weight: totalWeight });
                } else {
                    neighbors.push(cell);
                }
            }
        }
    }

    return neighbors;
};
// ------------------------------------------------------------------------------------------------//
// ------------------------------------------------------------------------------------------------//

class Simulator extends HTMLElement {
    constructor() {
        super();
        this.speed = 50;

        this.rows = parseInt(this.getAttribute('rows')) || 10;
        this.cols = parseInt(this.getAttribute('cols')) || 10; 
        this.arr = [];

        this.simulation_state = 'creative'
        this.toggle_box_state = false;
        this.grid = null
        this.start_cell = null
        this.end_cell = null 
        this.cell_click_handler = 'wall'

        this.timeouts = [];
        this.settings = {
            allowDiagonals: true,
            cellSize: 28,
            colors: { push: 'yellow', pop: 'gray', weighted: true},
            pathColor: 'green',
            pathOpacity: 1,
            visitedOpacity: 0.4
        }
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
        if (this.timeouts && this.timeouts.length) {
            this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.timeouts = [];
        }
        this.arr = [];
        this.simulation_state = 'creative'
        this.start_cell = null
        this.end_cell = null 
        this.connectedCallback();
    }
    static Stack = class {
        constructor({colors = {pop: 'gray', push: 'yellow' }} = {}) {
            this.items = {};
            this.top = 0;
            this.pushColor  = colors.push
            this.popColor = colors.pop
        }
    
        push(element) {
            element.style.backgroundColor = this.pushColor;
            element.isVisited = true;
            this.items[this.top] = element;
            this.top++;
        }
    
        pop() {
            if (this.isEmpty()) return null;

            this.top--;
            const value = this.items[this.top];
            delete this.items[this.top];
            value.style.backgroundColor = this.popColor;
            return value;
        }
    
        isEmpty() {
            return this.top === 0;
        }
    };
    static Queue = class {
        constructor({ 
            priorityKey = 'dist', 
            colors = { push: 'yellow', pop: 'gray', weighted: true }, 
            isPriority = false 
        }) {
            this.items = [];
            this.priorityKey = priorityKey;
            this.colors = colors;
            this.isPriority = isPriority;
        }
    
        push(node) {
            if (node.cell?.type !== 'start') {
                node.cell.style.backgroundColor = this.colors.push;
            }
    
            this.items.push(node);
    
            if (this.isPriority) {
                // Sort by priority
                this.items.sort((a, b) => a[this.priorityKey] - b[this.priorityKey]);
            }
    
            this.items.forEach((item, i, arr) => {
                if (item.cell.type !== 'start') {
                    item.cell.style.backgroundColor = this.colors.push;
                    if (this.colors.weighted && this.isPriority) {
                        item.cell.style.opacity = (1 - i / arr.length).toFixed(2);
                    }
                }
            });
        }
    
        pop() {
            if (this.isEmpty()) return null;
    
            const node = this.items.shift();
    
            if (node.cell.type !== 'start') {
                node.cell.style.backgroundColor = this.colors.pop;
            }
    
            node.cell.classList.remove('weight-1', 'weight-2', 'weight-3');
            node.cell.style.opacity = '1';
    
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

        grid_container_div.style.gridTemplateColumns = `repeat(${this.cols}, ${this.settings.cellSize}px)`;
        grid_container_div.style.gridTemplateRows = `repeat(${this.rows}, ${this.settings.cellSize}px)`;

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

                    // Remove weight classes if setting to wall
                    if (type === 'wall') {
                        this.classList.remove('weight-1', 'weight-2', 'weight-3');
                        this.weight = 0; // Also reset weight
                    }

                    // Make only start/end draggable
                    this.setAttribute('draggable', type === 'start' || type === 'end');
                };
                cell.classList.add('empty');
                // for toggling walls
                const togglewall = () => {
                    if(cell.type == 'start' || cell.type == 'end'){
                        return
                    }
                    cell.type == 'empty' ? cell.setType('wall') : cell.setType('empty')
                    cell.weight = 0;
                }
                const addWeight = () => {
                    if (cell.type === 'empty') {
                        if (cell.weight < 0.8) cell.weight += 0.3;
                
                        // Clamp to 0.8 max and fix floating-point rounding
                        cell.weight = Math.min(0.8, Math.round(cell.weight * 10) / 10);
                
                        // Remove existing weight classes
                        cell.classList.remove('weight-1', 'weight-2', 'weight-3');
                
                        // Map weight to class by closest step
                        let weightClass = '';
                        if (cell.weight <= 0.3) weightClass = 'weight-1';
                        else if (cell.weight <= 0.65) weightClass = 'weight-2';
                        else weightClass = 'weight-3';
                
                        if (weightClass) {
                            cell.classList.add(weightClass);
                        }
                    }
                };
                
                
                cell.addEventListener('click', () => {
                    this.cell_click_handler == 'wall' ? togglewall() : addWeight();
                });
                        
                cell.addEventListener('mousedown', (e) => {this.toggle_box_state = true; e.stopPropagation();});
                window.addEventListener('mouseup', (e) => {this.toggle_box_state = false;});

                cell.addEventListener('mouseover', () => {
                    if (this.toggle_box_state) {
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

                    const mouseUpEvent = new MouseEvent('mouseup', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                    });
                      
                    window.dispatchEvent(mouseUpEvent); // bandage fix to fire mouse up on drop (for custonm logic)
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
            const queue = new Simulator.Queue({colors: this.settings.colors});
            let current_node = { cell: this.start_cell, prev: null }
            queue.push(current_node)
            const animate = () => {
                if(current_node.cell === this.end_cell){
                    console.log('congrats')
                    return
                }
        
                const neighbors = this.arr.get2DNeighbors(current_node.cell.row, current_node.cell.col);
                for(let neighbor of neighbors){
                    if (!neighbor.isVisited){
                        neighbor.isVisited = true;
                        queue.push({ cell: neighbor, prev: current_node });
                    }
                }
                if(queue.isEmpty()){
                    console.log('failed');
                    return
                }
                current_node = queue.pop();
                const timeoutId = setTimeout(animate,speed);
                this.timeouts.push(timeoutId);
            }
            animate();
        }
        const dfs = (speed=20) => {
            const queue = new Simulator.Stack({colors: {push: this.settings.colors.push, pop: this.settings.colors.pop}});
            let current_cell = this.start_cell;
            queue.push(current_cell)
            const animate = () => {
                if(current_cell === this.end_cell){
                    console.log('congrats')
                    return
                }
                const neighbors = this.arr.get2DNeighbors(current_cell.row, current_cell.col, {allowDiagonals: this.settings.allowDiagonals});
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
                const timeoutId = setTimeout(animate,speed);
                this.timeouts.push(timeoutId);
            }
            animate();
        }
        const djk = (speed=20) => {
            const q = new Simulator.Queue({isPriority: true, colors: this.settings.colors});
            const visited_cells = new Set();

            let current_node = { cell: this.start_cell, dist: 0, prev: null }
            q.push(current_node)

            const animate = () => {
                if(current_node.cell === this.end_cell){ // found
                    console.log('congrats')
                    const out = []
                    
                    while(current_node.prev){
                        current_node.cell.style.opacity = this.settings.pathOpacity; // path opacity
                        current_node.cell.style.backgroundColor = this.settings.pathColor;
                        out.push(current_node.cell)
                        current_node = current_node.prev
                    }
                    console.log(out)
                    return;
                }
                if( current_node.cell.type!='start') current_node.cell.style.opacity = this.settings.visitedOpacity;

                const children = this.arr.get2DNeighbors(current_node.cell.row, current_node.cell.col, {withWeight: true, allowDiagonals: this.settings.allowDiagonals});
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
                const timeoutId = setTimeout(animate,speed);
                this.timeouts.push(timeoutId);
            }
            animate();
        }
        const astar = (speed=20) => {
            const q = new Simulator.Queue({isPriority: true, priorityKey: 'mdist',colors: this.settings.colors});
            const visited_cells = new Set();

            let current_node = { cell: this.start_cell, dist: 0, prev: null }
            q.push(current_node)

            const animate = () => {
                if(current_node.cell === this.end_cell){
                    console.log('congrats')
                    const out = []

                    while(current_node.prev){
                        current_node.cell.style.opacity = this.settings.pathOpacity;
                        current_node.cell.style.backgroundColor = this.settings.pathColor;
                        out.push(current_node.cell)
                        current_node = current_node.prev
                    }
                    console.log(out)
                    return
                }
                if( current_node.cell.type!='start') current_node.cell.style.opacity = this.settings.visitedOpacity;
                const children = this.arr.get2DNeighbors(current_node.cell.row, current_node.cell.col, {withWeight: true, allowDiagonals: this.settings.allowDiagonals});
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
                const timeoutId = setTimeout(animate,speed);
                this.timeouts.push(timeoutId);
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
            weight_button.innerHTML = weight_button.innerHTML === 'Add walls' ? 'Add weight': 'Add walls';
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