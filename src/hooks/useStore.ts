import { useEffect, useState } from 'react';
import { store, AppStoreState } from '../services/store.ts';

export function useStore() {
  const [state, setState] = useState<AppStoreState>(() => store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  return {
    state,
    tables: state.tables,
    activeGames: state.activeGames,
    history: state.history,
    activities: state.activities,
    staffCalls: state.staffCalls,
    settings: state.settings,
    currentUser: state.currentUser,

    // Store methods
    getTable: (id: number) => store.getTable(id),
    getCurrentGame: (id: number) => store.getCurrentGame(id),
    startGame: store.startGame.bind(store),
    updateScore: store.updateScore.bind(store),
    setDirectScore: store.setDirectScore.bind(store),
    undoScore: store.undoScore.bind(store),
    reportFoul: store.reportFoul.bind(store),
    reportFoulWithPenalty: store.reportFoulWithPenalty.bind(store),
    updateGameSetup: store.updateGameSetup.bind(store),
    pauseGame: store.pauseGame.bind(store),
    resumeGame: store.resumeGame.bind(store),
    endGame: store.endGame.bind(store),
    resetGame: store.resetGame.bind(store),
    setTableMaintenance: store.setTableMaintenance.bind(store),
    callStaff: store.callStaff.bind(store),
    resolveStaffCall: store.resolveStaffCall.bind(store),
    updateSettings: store.updateSettings.bind(store),
    setAuthUser: store.setAuthUser.bind(store),
    switchUserRole: store.switchUserRole.bind(store),
    switchActivePlayer: store.switchActivePlayer.bind(store),
    resetPlayerTimer: store.resetPlayerTimer.bind(store),
    setTableCameraFeed: store.setTableCameraFeed.bind(store),
    claimTableRemote: store.claimTableRemote.bind(store),
    heartbeatTableRemote: store.heartbeatTableRemote.bind(store),
    releaseTableRemote: store.releaseTableRemote.bind(store),
    takeOverTableRemote: store.takeOverTableRemote.bind(store),
    getTableRemoteStatus: store.getTableRemoteStatus.bind(store),
    pullTableFromServer: store.pullTableFromServer.bind(store),
    syncTableEntity: store.syncTableEntity.bind(store),
    setTableTheme: store.setTableTheme.bind(store),
    getTableTheme: store.getTableTheme.bind(store),
    resetAllData: store.resetAllData.bind(store),
    resetToDemoData: store.resetToDemoData.bind(store),
  };
}
