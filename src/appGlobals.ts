
interface IAppGlobals {
    userId : string | null,
    appVersion : string | null
}


const appGlobals : IAppGlobals = {
    userId : null,
    appVersion : null
};

Object.seal(appGlobals);

export default appGlobals;

