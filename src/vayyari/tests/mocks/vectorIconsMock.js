const React = require('react');
const mockIcon = (props) => React.createElement('span', props);

module.exports = {
  Feather: mockIcon,
  MaterialCommunityIcons: mockIcon,
  Ionicons: mockIcon,
  default: {
    Feather: mockIcon,
    MaterialCommunityIcons: mockIcon,
    Ionicons: mockIcon,
  },
};
