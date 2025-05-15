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
        
      this.addEventListener('mousedown', this.onMouseDown);
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    }
  
    disconnectedCallback() {
      this.removeEventListener('mousedown', this.onMouseDown);
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    }
    
    onMouseDown(e) {
        console.log(e.target)
        const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'label'];
        const isNotDraggable = e.target.isNotDraggable || false;

        // Check if the target or its ancestor has an onclick handler
        const isInteractive = e.target.closest(interactiveTags.join(','));

        // If it's draggable, interactive, or has a click event, don't start dragging
        if (isInteractive || isNotDraggable || e.target.closest('[draggable="true"]')) return;

        this.isDragging = true;
        this.offsetX = e.clientX - this.offsetLeft;
        this.offsetY = e.clientY - this.offsetTop;
        this.style.zIndex = 1000;
    }
  
    onMouseMove(e) {
      if (this.isDragging) {
        this.style.left = `${e.clientX - this.offsetX}px`;
        this.style.top = `${e.clientY - this.offsetY}px`;
      }
    }
  
    onMouseUp() {
      this.isDragging = false;
    }
}
customElements.define('draggable-element', Draggable);
  