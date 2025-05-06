export const exportToPNG = async () => {
  const html2canvas = (await import("html2canvas")).default;
  const canvasElement = document.querySelector(".mindmap-container");

  const canvas = await html2canvas(canvasElement, {
    backgroundColor: "#ffffff",
    scale: 2,
  });

  const link = document.createElement("a");
  link.download = "mind-map.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};
