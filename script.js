function SendMessage() {
  const baseLink = "mailto:hfbmartinus@gmail.com";
  const subject = document.querySelector("#subject").value;
  const message = document.querySelector("#body").value;
  window.open(baseLink + "?subject=" + subject + " [via hermanmartinus.github.io]&body=" + message, '_blank');
}