/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, Button, Image} from 'react-native';
import { createStackNavigator, createAppContainer, ScrollView } from "react-navigation";


import ImagePicker from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import axios from 'axios';

const baseUrlGoogle = 'https://vision.googleapis.com/v1/images:annotate';
const baseUrlApi = 'https://bionic-upgrade-236223.appspot.com/';

const options = {
  title: 'Select Avatar',
  storageOptions: {
    skipBackup: true,
    path: 'images',
  },
};

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});

class HomeScreen extends Component {
  static navigationOptions = {
    title: 'Recipe App',
    headerStyle: {
      backgroundColor: '#4682b4',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    }
  };
  
  constructor(props) {
    super(props);
    this.state = {
      avatarSource: null,
      labels: [],
      hasPhoto: false,
      dishName: null
    };
    this.handleTakePhoto = this.handleTakePhoto.bind(this);
    this.handleGetRecipe = this.handleGetRecipe.bind(this);
  }

  handleTakePhoto() {
    ImagePicker.showImagePicker(options, (response) => {
      console.log('Response = ', response);
      
      if (response.didCancel) {
	console.log('User cancelled image picker');
      } else if (response.error) {
	console.log('ImagePicker Error: ', response.error);
      } else if (response.customButton) {
	console.log('User tapped custom button: ', response.customButton);
      } else {
	const source = { uri: response.uri };
	
	// You can also display the image using data:
	// const source = { uri: 'data:image/jpeg;base64,' + response.data };
	const url = `${baseUrlGoogle}?key=AIzaSyCAFLHFvBGDgBiBa50eUOJoSmkkZ3VF0U0`;
	RNFS.readFile(source.uri, 'base64').then((encodedUri) => {
	  return axios.post(url, {
	    requests: [
	      {
		image: {
		  content: encodedUri
		},
		features: [
		  {
		    type: "LABEL_DETECTION",
		    maxResults: 10
		  }
		]
	      }
	    ]
	  });
	}).then((res) => {
	  let newLabels = [];
	  res.data.responses[0].labelAnnotations.forEach((label) => {
	    newLabels.push(label.description);
	  });
	  this.setState({
	    labels: newLabels,
	    avatarSource: source
	  });
	  return axios.get(`${baseUrlApi}foodlist`);
	}).then((res) => {
	  let matchedFood = null;
	  for (let label of this.state.labels)
	    for (let food of res.data)
	      if (food == label) {
		matchedFood = food;
		break;
	      }
	  if (!matchedFood)
	    this.setState({
	      dishName: 'No dish found',
	      avatarSource: source,
	      hasPhoto: true
	    });
	  else
	    this.setState({
	      dishName: matchedFood,
	      avatarSource: source,
	      hasPhoto: true
	    });
	}).catch((err) => {
	  this.setState({
	    dishName: [err.message]
	  })
	})

      }
    });
  }

  handleGetRecipe() {
    this.setState({
      avatarSource: null,
      labels: [],
      hasPhoto: false,
      dishName: null
    });
    this.props.navigation.navigate('Recipe', {
      dishName: this.state.dishName
    });
  }
  
  render() {
    const buttonColor = '#01796f';
    let image = <Text></Text>;
    if (this.state.avatarSource)
      image = <Image source={this.state.avatarSource} style={styles.image} />;
    let labels = this.state.labels.map((label) => (
      <Text>{label}</Text>
    ));
    let dish = <Text>{this.state.dishName}</Text>;
    let button_1 = (
      <Button onPress={this.handleTakePhoto} title="Take Photo Now!" color={buttonColor}/>
    );
    let button_2 = (
      <Button
	onPress={() => this.props.navigation.navigate('Calender')}
	title="Check the Calender!"
	color={buttonColor}
      />
    )
    if (this.state.hasPhoto)
      button_1 = (
	<Button
	  onPress={this.handleGetRecipe}
	  title="Show the Recipe!"
	  color={buttonColor}
	/>
      );
    return (
      <View style={styles.container}>
	<Text style={styles.welcome}>Welcome to the Recipe App!</Text>
	{image}
	{dish}
	<View style={styles.container}>
	  {button_1}
	</View>
	<View style={styles.container}>
	  {button_2}
	</View>
      </View>
    );
  }
}

class RecipeScreen extends Component {
  static navigationOptions = {
    title: 'Recipe',
    headerStyle: {
      backgroundColor: '#4682b4',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    }
  };
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      location: '',
      ingredients: [],
      dishName: this.props.navigation.getParam('dishName'),
      latitude: 0,
      longitude: 0,
      error: null
    };
  }

  componentDidMount() {
    // get the longitude and latitude
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
        });
      },
      (error) => this.setState({ error: error.message }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
    );
    let latitude = this.state.latitude;
    let longitude = this.state.longitude;
    // call backend api
    axios.get(`${baseUrlApi}getstore/${this.state.dishName}_${latitude}_${longitude}`)
	 .then((res) => {
	   if (res.data.length !== 0) {
	     this.setState({
	       name: res.data[0].name,
	       location: res.data[0].address,
	       ingredients: res.data[0].ingredients.split(', ')
	     });	     
	   }

	 }).catch((err) => {
	   this.setState({
	     name: err.message
	   });
	 });
  }
  
  render() {
    // render the resulting recipe list
    const ingredients = this.state.ingredients.map((ingredient, i) => (
      <Text key={i} style={styles.instructions}>{ingredient}</Text>
    ));
    
    return (
      <View style={styles.container}>
	<Text style={styles.welcome}>{this.state.dishName}</Text>
	<Text style={styles.instructions}>Your Recipe:</Text>
	{ingredients}
	<Text style={styles.instructions}>Store: {this.state.name}</Text>
	<Text style={styles.instructions}>Address: {this.state.location}</Text>
	<Button
	  onPress={() => this.props.navigation.goBack()}
	  title="Back to Home"
	  color="#01796f"
	/>
      </View>
    );
  }
}

class CalenderScreen extends React.Component {
  static navigationOptions = {
    title: 'Free Food Near Me',
    headerStyle: {
      backgroundColor: '#4682b4',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },

  };

  constructor(props) {
    super(props);
    this.state = {
      recv: []
    };
  };
 
  componentDidMount() {
    url = "https://bionic-upgrade-236223.appspot.com/freefood/2019-03-30";
    let oldrecv = this.state.recv.map((r) => r);

    fetch(url).then(data => {
      return data.json()
    }).then(result => {
      for (let r of result)
        oldrecv.push(r);
      url = "https://bionic-upgrade-236223.appspot.com/freefood/2019-03-31";
      return fetch(url);
    }).then(data => {
      return data.json();
    }).then(res => {
      for (let r of res)
        oldrecv.push(r)
      url = "https://bionic-upgrade-236223.appspot.com/freefood/2019-04-01";
      return fetch(url);
    }).then(data => {
      return data.json();
    }).then(res => {
      for (let r of res)
        oldrecv.push(r)
      url = "https://bionic-upgrade-236223.appspot.com/freefood/2019-04-02";
      return fetch(url);
    }).then(data => {
      return data.json();
    }).then(res => {
      for (let r of res)
        oldrecv.push(r)
      this.setState({recv: oldrecv});
    });
  }

  render() {
    
    const sorted = this.state.recv.sort((a, b) => {
      let astr = a.date.split('-');
      let bstr = b.date.split('-');
      if (Number(astr[0]) > Number(bstr[0]))
	return 1;
      else if (Number(astr[1]) > Number(bstr[1]))
	return 1;
      else if (Number(astr[2]) > Number(bstr[2]))
	return 1;
      else
	return -1;
    });
    
    const styleItem = {
      width: 350,
      height: 80,
      marginVertical: 15,
      backgroundColor: 'skyblue',
      color: '#ffffff',
      alignItems: 'baseline'
    };
    

    const events = sorted.map((r, i) => {
      if (i <= 10)
	return (
	  <View style={styleItem} key={i}>
            <Button
              title={`${r.event} ${r.date} ${r.start}`}
              onPress={() => this.props.navigation.navigate('Details', {
		  event: r.event,
		  org: r.org,
		  location: r.location,
		  details: r.details
	      })}
            />
	  </View>	  
	);
    })
    

    return (
      <ScrollView style={{flex: 1, pagingEnabled: true}}>
	{events}
        <Button
          title="Go to Home"
          onPress={() => this.props.navigation.navigate('Home')}
        />

      </ScrollView>
    );
  }  
}

class DetailsScreen extends React.Component {
  constructor(props) {
    super(props);
  }

  static navigationOptions = ({navigation}) => {
    return {
      title: navigation.getParam('event'),
      headerStyle: {
	backgroundColor: '#4682b4',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
	fontWeight: 'bold',
      }
    }
  }
  
  render() {
    return (
      <View style={styles.container}>
	<Text style={{margin: 10, fontSize: 20}}>
	  {this.props.navigation.getParam('org')}
	</Text>
	<Text style={{margin: 10, fontSize: 20}}>
	  {this.props.navigation.getParam('location')}
	</Text>
	<Text style={{margin: 20, fontSize: 15}}>
	  {this.props.navigation.getParam('details')}
	</Text>
        <Button
          title="Go to Home"
          onPress={() => this.props.navigation.navigate('Home')}
        />
      </View>
    );
  }
}



const styles = StyleSheet.create({
  container: {
    margin: 10,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  image: {
    width: 120,
    height: 120
  }
});

const AppNavigator = createStackNavigator(
  {
    Home: HomeScreen,
    Recipe: RecipeScreen,
    Calender: CalenderScreen,
    Details: DetailsScreen
  },
  {
    initialRouteName: 'Home'
  }
);

const AppContainer = createAppContainer(AppNavigator);

export default class App extends Component {
  constructor(props) {
    super(props);
    this.handleNavigate = this.handleNavigate.bind(this);
  }

  handleNavigate() {
    
  }
  
  render() {
    return (
      <AppContainer
	onNavigationStateChange={this.handleNavigate}
      />
    );
  }
};
