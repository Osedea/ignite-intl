# Ignite Intl plugin

This plugin will setup your application for internationalization using:
* https://github.com/react-native-community/react-native-localize : To get data on the locales of the user that are defined in the OS settings
* https://github.com/formatjs/react-intl : To handle the actual management of translated strings

## Add plugin

```sh
ignite add intl
```

## Remove plugin

```sh
ignite remove intl
```

## Use in my app

To your top component, add the `IntlProvider` and locale change listener:

```diff
import React, { Component } from 'react';
+ import * as RNLocalize from 'react-native-localize';
+ import { IntlProvider } from 'react-intl';

+ const translations = {
+     fr: { hello: 'Bonjour' },
+     en: { hello: 'Hello' },
+ }
+ const locales = ['en', 'fr'];

class Root extends Component {
+    state = { locale: 'en' };
+
+    handleLocalizationChange = () => {
+        const locale = RNLocalize.findBestAvailableLanguage(locales).languageTag;
+        this.setState({ locale });
+    }
+
+    componentDidMount() {
+        RNLocalize.addEventListener("change", handleLocalizationChange);
+    }
+
+    componentWillUnmount() {
+        RNLocalize.removeEventListener("change", handleLocalizationChange);
+    }

    render() {
        return (
+            <IntlProvider locale={this.state.locale} messages={translations[this.state.locale]}>
-            <App />
+                <App />
+            </IntlProvider>
        );
    }
}

export default Root;
```

In any other component:

```diff
import React, { Component } from 'react';
import { View, Text } from 'react-native';
+ import {injectIntl } from 'react-intl';

class App extends Component {
    render() {
        return (
            <View>
-               <Text>Hey, how are you?</Text>
+               <Text>{this.props.intl.formatMessage({ id: 'hello' })}</Text>
            </View>
        );
    }
}

- export default App;
+ export default injectIntl(App);
```

## Compatibility 

This has been tested with React Native [0.61.4](https://github.com/facebook/react-native/releases/tag/v0.61.4).

## Contributing

Please open an issue for any compatibility issues, or provide better interactivity/compatibility through opening a PR! 🙂


