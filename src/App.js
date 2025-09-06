import { Routes, Route, Navigate } from "react-router-dom";
import routes from "routes";
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";
import { useMaterialUIController } from "context";

function App() {
  const [controller] = useMaterialUIController();
  const { sidenavColor } = controller;

  const getRoutes = (allRoutes) =>
    allRoutes
      .filter((r) => r.route)
      .map(({ route, component, key }) => <Route path={route} element={component} key={key} />);

  return (
    <>
      <Sidenav color={sidenavColor} brandName="LeadGrad" routes={routes} />
      <Configurator />
      <Routes>
        {getRoutes(routes)}
        <Route path="*" element={<Navigate to="/authentication/sign-in" />} />
      </Routes>
    </>
  );
}

export default App;
