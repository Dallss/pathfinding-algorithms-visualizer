class Draggable extends HTMLElement {
    constructor() {
      super();
      // Instance variables
      this.isDragging = false;
      this.offsetX = 0;
      this.offsetY = 0;
  
      // Event bindings
      this.onMouseDown = this.onMouseDown.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onMouseUp = this.onMouseUp.bind(this);
    }
  
    connectedCallback() {
      // Basic styles
      this.style.width = 'fit-content';
      this.style.height = 'fit-content';
      this.style.padding = '2px';
      this.style.position = 'absolute'; 
        
      this.addEventListener('mousedown', (e)=>{this.onMouseDown(e); e.stopPropagation();});
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseup', this.onMouseUp);
    }
  
    disconnectedCallback() {
      this.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);
    }
    
    onMouseDown(e) {
      const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'label'];
      const isNotDraggable = e.target.isNotDraggable || false;
      const isInteractive = e.target.closest(interactiveTags.join(','));
      const isCell = e.target.classList && e.target.classList.contains('cell');
    
      // Prevent dragging if the element is interactive, a cell, or explicitly marked non-draggable
      if (isInteractive || isNotDraggable || isCell || e.target.closest('[draggable="true"]')) return;
    
      this.isDragging = true;
    
      // Calculate the element's world position
      const rect = e.currentTarget.getBoundingClientRect();
      const worldElementX = (rect.left - pan.x) / window.scale;
      const worldElementY = (rect.top - pan.y) / window.scale;
      this.offsetX = (e.clientX - pan.x) / window.scale - worldElementX;
      this.offsetY = (e.clientY - pan.y) / window.scale - worldElementY;
    
      this.style.position = 'absolute'; // ensure draggable
      this.style.zIndex = 1000;
    }
    
    onMouseMove(e) {
      let offset = { x: 0, y: 0 };
      if (!this.isDragging) return;
  
      // Calculate mouse position in world coordinates
      const worldMouseX = (e.clientX - pan.x) / window.scale;
      const worldMouseY = (e.clientY - pan.y) / window.scale;
      const x = worldMouseX - this.offsetX;
      const y = worldMouseY - this.offsetY;
      this.style.left = `${x}px`;
      this.style.top = `${y}px`;
    }
    
    
    onMouseUp() {
      this.isDragging = false;
    }
}
customElements.define('draggable-element', Draggable);
  