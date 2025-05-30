import { useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
const PowerBIModal = () => {
const [open, setOpen] = useState(false);
  return (
    <>
      <Button   variant="contained"
                  color="inherit"
                  onClick={() => setOpen(true)}
                  style={{ marginBottom: "20px", marginLeft: "10px" }}>Abrir Power BI</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullScreen>
        <DialogContent className="w-full h-full flex flex-col p-0 m-0">
          <div className="flex-grow w-full h-full">
          <iframe title="CRM" width="1500" height="1000" src="https://app.powerbi.com/reportEmbed?reportId=47935f8f-c832-4dba-bac4-b1251989c823&autoAuth=true&ctid=6de942ab-69e6-4a60-9aa9-85170719c80b" className="w-full h-full border-none" allowFullScreen ></iframe>
          </div>
        </DialogContent>
        <Button variant="contained"
                  color="inherit"
                  onClick={() => setOpen(false)}
                  style={{ marginBottom: "20px", marginLeft: "10px" }}>Fechar</Button>
      </Dialog>
    </>
  );
};

export default PowerBIModal;

