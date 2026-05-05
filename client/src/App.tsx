import { Route, Switch } from "wouter";
import ComingSoon from "./pages/ComingSoon";
import TradeJournal from "./pages/TradeJournal";

function App() {
  return (
    <Switch>
      <Route path="/journal" component={TradeJournal} />
      <Route component={ComingSoon} />
    </Switch>
  );
}

export default App;
