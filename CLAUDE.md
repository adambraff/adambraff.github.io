# adambraff.github.io

Adam Braff's GitHub Pages site. Tools live in `tools/<tool-name>/` with a self-contained `index.html` and a `README.md`. The homepage (`index.html`) lists each tool as a tile with an 800x800 JPEG in `assets/tiles/`.

## Conventions for new tools

- Add this footer at the bottom of every new tool page by default:

  ```html
  <footer class="site-footer">
    <span>Adam Braff</span>
    <a href="https://braff.co/advice">Blog</a>
    <a href="https://adambraff.github.io/">More tools</a>
  </footer>
  ```

  Style it small and muted to match the page (see `tools/ai-labor-market/index.html` for a reference implementation).
- Add a homepage tile for each new tool: title, one-sentence description, and `(Month Year)` date.
- Client-side only: HTML, CSS, vanilla JS. No backend.
