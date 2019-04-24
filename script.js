function flipIt () {
  const stylesheet = document.getElementById('stylesheet')
  if (stylesheet.getAttribute('href').includes('dist/dark.css')) {
    stylesheet.setAttribute('href', stylesheet.getAttribute('href').replace('dist/dark.css', 'dist/light.css'));
  } else {
    stylesheet.setAttribute('href', stylesheet.getAttribute('href').replace('dist/light.css', 'dist/dark.css'));
  }
}