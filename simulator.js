Array.prototype.get2DNeighbors = function(current_row, current_col) {
    const neighbors = [];

    // Check Up-Left (-1, -1)
    if (current_row - 1 >= 0 && current_col - 1 >= 0) {
        neighbors.push(this[current_row - 1][current_col - 1]);
    }

    // Check Up (-1, 0)
    if (current_row - 1 >= 0) {
        neighbors.push(this[current_row - 1][current_col]);
    }

    // Check Up-Right (-1, +1)
    if (current_row - 1 >= 0 && current_col + 1 < this[0].length) {
        neighbors.push(this[current_row - 1][current_col + 1]);
    }

    // Check Right (0, +1)
    if (current_col + 1 < this[0].length) {
        neighbors.push(this[current_row][current_col + 1]);
    }

    // Check Down-Right (+1, +1)
    if (current_row + 1 < this.length && current_col + 1 < this[0].length) {
        neighbors.push(this[current_row + 1][current_col + 1]);
    }

    // Check Down (+1, 0)
    if (current_row + 1 < this.length) {
        neighbors.push(this[current_row + 1][current_col]);
    }

    // Check Down-Left (+1, -1)
    if (current_row + 1 < this.length && current_col - 1 >= 0) {
        neighbors.push(this[current_row + 1][current_col - 1]);
    }

    // Check Left (0, -1)
    if (current_col - 1 >= 0) {
        neighbors.push(this[current_row][current_col - 1]);
    }

    return neighbors;
};

class Simulator extends HTMLElement {
    constructor() {
        super();
        this.rows = parseInt(this.getAttribute('rows')) || 10;
        this.cols = parseInt(this.getAttribute('cols')) || 10; 
        this.arr = [];

        this.simulation_state = 'creative'
        this.start_cell = null
        this.end_cell = null 
    }
    connectedCallback() {
        this.algo = this.getAttribute('algo') || 'bfs';
        this.render();
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
    
    getAlgo() {
        const bfs = (speed=20) => {
            const queue = new Simulator.Queue(); // replace with more efficient someday
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
                    return
                }
                current_cell = queue.pop();
                setTimeout(animate,speed);
            }
            animate();
        }
        const djk = () => {
            console.log('we runin djk')
        }

        console.log(this.algo)
        if(this.algo == 'bfs')
            return bfs
        if(this.algo == 'djk')
            return djk
        return ()=>console.log('ERROR: invalid algo')
    }

    simulate(){
        const algo = this.getAlgo();
        algo();
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
        const grid_container_div = document.createElement('div');
        grid_container_div.classList.add('grid-map')
        grid_container_div.style.gridTemplateColumns = `repeat(${this.cols}, 40px)`;
        grid_container_div.style.gridTemplateRows = `repeat(${this.rows}, 40px)`;

        const panel = document.createElement('div');
        const select_end_button = document.createElement('button');
        const select_start_button = document.createElement('button');
        const simulate_button = document.createElement('button');
        select_start_button.innerHTML = 'Select Start'
        select_end_button.innerHTML = 'Select End'
        simulate_button.innerHTML = 'Start Simulation'
        select_start_button.classList.add('start')
        select_end_button.classList.add('end')
        simulate_button.classList.add('simulate-button')
        
        select_start_button.onclick = () => this.setSimulationState('select-start');
        select_end_button.onclick = () => this.setSimulationState('select-end');
        simulate_button.onclick = () => this.simulate();

        panel.classList.add('panel');
        panel.appendChild(select_start_button)
        panel.appendChild(select_end_button)
        panel.appendChild(simulate_button)

        this.appendChild(grid_container_div)
        this.appendChild(panel);

        for (let r = 0; r < this.rows; r++) {
            const col = []
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                grid_container_div.appendChild(cell);
                cell.classList.add('cell');
                cell.type = 'empty'
                cell.row = r;
                cell.col = c;
                cell.isVisited = false;
                cell.setType= function (type = 'empty') {
                    const types = ['empty', 'start', 'end', 'wall']
                    types.forEach(t => this.classList.remove(t));
                    this.classList.add(type);
                    
                    this.type = type
                }
                
                cell.addEventListener('click', () => {

                    if (this.simulation_state == 'select-start'){
                        this.start_cell.setType()
                        cell.setType('start')
                        this.start_cell = cell

                        this.setSimulationState('creative')
                        return
                    }
                    if (this.simulation_state == 'select-end'){
                        this.end_cell.setType()     
                        cell.setType('end')
                        this.end_cell = cell

                        this.setSimulationState('creative')
                        return
                    }

                    if(cell.type == 'start' || cell.type == 'end'){
                        return
                    }
                    cell.type == 'empty' ? cell.setType('wall') : cell.setType('empty')
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
    }
}
customElements.define('path-finding-simulator', Simulator);